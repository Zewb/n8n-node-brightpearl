import { setTimeout as sleep } from 'node:timers/promises';
import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IDataObject,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

// Brightpearl rate-limit handling:
//   - Quota exhausted -> HTTP 503 + `brightpearl-throttle-time` header (seconds)
//   - Short-term burst -> HTTP 429 + `Retry-After` header (seconds)
// We retry transparently, honoring whichever header is present, up to a
// capped number of attempts and a max single-wait so a runaway server
// can't pin a workflow forever.
const RATE_LIMIT_MAX_RETRIES = 5;
const RATE_LIMIT_MAX_WAIT_SECONDS = 60;
const RATE_LIMIT_DEFAULT_WAIT_SECONDS = 5;

function parseWaitSeconds(value: unknown): number | undefined {
	if (value === undefined || value === null) return undefined;
	const n = Number(String(value));
	if (Number.isNaN(n) || n <= 0) return undefined;
	return Math.min(Math.ceil(n), RATE_LIMIT_MAX_WAIT_SECONDS);
}

function getCredentialName(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
): 'brightpearlApi' | 'brightpearlOAuth2Api' {
	// Read the node's Authentication parameter. Falls back to private app if the
	// node doesn't expose the field (older configs / non-execute contexts).
	try {
		const auth = this.getNodeParameter('authentication', 0, 'privateApp') as string;
		return auth === 'oauth2' ? 'brightpearlOAuth2Api' : 'brightpearlApi';
	} catch {
		return 'brightpearlApi';
	}
}

export async function brightpearlApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body?: IDataObject | IDataObject[],
	qs: IDataObject = {},
	extraHeaders: IDataObject = {},
): Promise<IDataObject> {
	const credentialName = getCredentialName.call(this);
	const credentials = await this.getCredentials(credentialName);

	const headers: IDataObject = {
		'Content-Type': 'application/json',
		...extraHeaders,
	};

	// Inject the Brightpearl-specific headers for OAuth here as well as in the
	// credential's `authenticate` block. n8n's behaviour for `authenticate` on
	// oAuth2Api-extending credentials varies — doing both guarantees the headers
	// reach the API call (extra/duplicate header values are harmless).
	if (credentialName === 'brightpearlOAuth2Api') {
		if (credentials.appReference)
			headers['brightpearl-app-ref'] = credentials.appReference as string;
		if (credentials.devReference)
			headers['brightpearl-dev-ref'] = credentials.devReference as string;
	}

	// For OAuth, prefer the api_domain Brightpearl returned in the token
	// response over the user-configured datacenter — tokens are datacenter-
	// scoped and the configured datacenter may not match the account's actual
	// home. Falls back to the configured value if the token data isn't stored.
	let host = credentials.datacenter as string;
	if (credentialName === 'brightpearlOAuth2Api') {
		const tokenData = credentials.oauthTokenData as IDataObject | undefined;
		const apiDomain = tokenData?.api_domain as string | undefined;
		if (apiDomain) host = apiDomain;
	}

	const options: IHttpRequestOptions = {
		method,
		url: `https://${host}/public-api/${credentials.accountCode}${resource}`,
		headers,
		qs,
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};

	if (body !== undefined) {
		options.body = body as IDataObject;
	}

	for (let attempt = 0; attempt < RATE_LIMIT_MAX_RETRIES; attempt++) {
		let response: { statusCode: number; headers: IDataObject; body: IDataObject };
		try {
			response = (await this.helpers.httpRequestWithAuthentication.call(
				this,
				credentialName,
				options,
			)) as { statusCode: number; headers: IDataObject; body: IDataObject };
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as unknown as JsonObject);
		}

		const { statusCode, headers, body: responseBody } = response;

		// Retry on rate-limit responses (503 quota exhausted, 429 burst limit).
		if (statusCode === 503 || statusCode === 429) {
			if (attempt < RATE_LIMIT_MAX_RETRIES - 1) {
				const waitSeconds =
					parseWaitSeconds(headers['brightpearl-throttle-time']) ??
					parseWaitSeconds(headers['retry-after']) ??
					RATE_LIMIT_DEFAULT_WAIT_SECONDS;
				await sleep(waitSeconds * 1000);
				continue;
			}
			throw new NodeApiError(this.getNode(), {
				message: `Brightpearl rate-limit retries exhausted (${RATE_LIMIT_MAX_RETRIES} attempts, status ${statusCode})`,
				httpCode: String(statusCode),
			} as unknown as JsonObject);
		}

		if (statusCode >= 400) {
			throw new NodeApiError(this.getNode(), {
				message: `Brightpearl API error ${statusCode}`,
				description:
					typeof responseBody === 'object'
						? JSON.stringify(responseBody)
						: String(responseBody),
				httpCode: String(statusCode),
			} as unknown as JsonObject);
		}

		return responseBody;
	}

	// Unreachable — every path in the loop either returns or throws — but
	// satisfies TypeScript's noImplicitReturns.
	throw new NodeApiError(this.getNode(), {
		message: 'Brightpearl request failed: retry loop exited unexpectedly',
	} as unknown as JsonObject);
}

interface BrightpearlSearchColumn {
	name: string;
	referenceData?: string[];
}

/**
 * Build the sibling key for a resolved reference value. Columns like
 * `orderStatusId` -> `orderStatusName` (strip Id, add Name). Anything else
 * gets a `Label` suffix.
 */
function refLabelKey(columnName: string): string {
	if (columnName.endsWith('Id')) return columnName.slice(0, -2) + 'Name';
	return columnName + 'Label';
}

/**
 * Brightpearl search endpoints return results as positional arrays, and the
 * top-level `reference` block maps coded IDs (e.g. orderStatusId=5) to display
 * names. This converts each row to a keyed object AND attaches resolved label
 * fields for any column whose metaData declares `referenceData`.
 */
export function searchResultsToObjects(response: IDataObject): IDataObject[] {
	const inner = response?.response as IDataObject | undefined;
	const metaData = inner?.metaData as IDataObject | undefined;
	const results = inner?.results as unknown[][] | undefined;
	const referenceData = response?.reference as IDataObject | undefined;

	if (!metaData?.columns || !results) return [];

	const columns = metaData.columns as BrightpearlSearchColumn[];

	return results.map((row) => {
		const obj: IDataObject = {};

		columns.forEach((col, idx) => {
			const value = row[idx];
			obj[col.name] = value as IDataObject[keyof IDataObject];

			// Resolve reference data labels (e.g. orderStatusId=5 -> orderStatusName="Complete - Cancelled")
			if (!col.referenceData?.length || !referenceData) return;
			if (value === null || value === undefined) return;

			const refKey = col.referenceData[0];
			const refTable = referenceData[refKey] as IDataObject | undefined;
			if (!refTable) return;

			const label = refTable[String(value)];
			if (label === undefined) return;

			obj[refLabelKey(col.name)] = label as IDataObject[keyof IDataObject];
		});

		return obj;
	});
}

// ─── Order simplification helpers ──────────────────────────────────────────
// Brightpearl's GET /sales-order/{id} returns a deeply-nested shape that's
// awkward to map in workflows: orderStatus is its own object, parties wraps
// customer/billing/delivery, orderRows is keyed by row ID instead of an array,
// totalValue uses verbose field names, etc. simplifyOrder() flattens it into
// a shape that matches Brightpearl's webhook payload style — easier to JSONPath.

const ADDRESS_FIELDS = [
	'addressFullName',
	'companyName',
	'addressLine1',
	'addressLine2',
	'addressLine3',
	'addressLine4',
	'postalCode',
	'countryIsoCode',
	'telephone',
	'mobileTelephone',
	'fax',
	'email',
] as const;

function simplifyParty(
	party: IDataObject | undefined,
	opts: { idField?: 'id' | 'contactId'; extra?: IDataObject } = {},
): IDataObject {
	if (!party) return {};
	const address: IDataObject = {};
	for (const field of ADDRESS_FIELDS) {
		if (party[field] !== undefined) address[field] = party[field];
	}

	const result: IDataObject = {};
	if (opts.idField && party.contactId !== undefined) {
		result[opts.idField] = party.contactId;
	}
	if (Object.keys(address).length > 0) result.address = address;
	if (opts.extra) Object.assign(result, opts.extra);
	return result;
}

function simplifyRow(rowId: string, row: IDataObject): IDataObject {
	const rowValue = (row.rowValue as IDataObject) ?? {};
	const composition = (row.composition as IDataObject) ?? {};
	const quantity = (row.quantity as IDataObject) ?? {};
	const productPrice = (row.productPrice as IDataObject) ?? {};
	const itemCost = (row.itemCost as IDataObject) ?? {};
	const rowNet = (rowValue.rowNet as IDataObject) ?? {};
	const rowTax = (rowValue.rowTax as IDataObject) ?? {};

	return {
		id: Number(rowId),
		productId: row.productId,
		name: row.productName,
		sku: row.productSku,
		quantity: quantity.magnitude,
		taxCode: rowValue.taxCode,
		tax: rowTax.value,
		net: rowNet.value,
		nominalCode: row.nominalCode,
		productPrice: productPrice.value,
		discountPercentage: row.discountPercentage,
		sequence: row.orderRowSequence !== undefined ? Number(row.orderRowSequence) : undefined,
		bundleChild: composition.bundleChild,
		bundleParent: composition.bundleParent,
		parentRowId: composition.parentOrderRowId,
		taxClassId: rowValue.taxClassId,
		rowCost: { unshippedCost: itemCost.value },
		taxCalculator: rowValue.taxCalculator,
		clonedFromId: row.clonedFromId,
	};
}

export function simplifyOrder(raw: IDataObject): IDataObject {
	const orderStatus = (raw.orderStatus as IDataObject) ?? {};
	const parties = (raw.parties as IDataObject) ?? {};
	const rawCustomer = (parties.customer as IDataObject) ?? {};
	const rawBilling = (parties.billing as IDataObject) ?? {};
	const rawDeliveryParty = (parties.delivery as IDataObject) ?? {};
	const deliveryMeta = (raw.delivery as IDataObject) ?? {};
	const assignment = ((raw.assignment as IDataObject)?.current as IDataObject) ?? {};
	const rawCurrency = (raw.currency as IDataObject) ?? {};
	const rawTotal = (raw.totalValue as IDataObject) ?? {};
	const invoices = (raw.invoices as IDataObject[]) ?? [];
	const rawOrderRows = (raw.orderRows as IDataObject) ?? {};

	return {
		id: raw.id,
		version: raw.version,
		ref: raw.reference,
		parentId: raw.parentOrderId,
		statusId: orderStatus.orderStatusId,
		statusName: orderStatus.name,
		warehouseId: raw.warehouseId,
		channelId: assignment.channelId,
		staffOwnerId: assignment.staffOwnerContactId,
		projectId: assignment.projectId,
		leadSourceId: assignment.leadSourceId,
		teamId: assignment.teamId,
		priceListId: raw.priceListId,
		priceModeCode: raw.priceModeCode,
		costPriceListId: raw.costPriceListId,
		placedOn: raw.placedOn,
		createdOn: raw.createdOn,
		updatedOn: raw.updatedOn,
		closedOn: raw.closedOn,
		createdBy: raw.createdById,
		orderPaymentStatus: raw.orderPaymentStatus,
		stockStatusCode: raw.stockStatusCode,
		allocationStatusCode: raw.allocationStatusCode,
		shippingStatusCode: raw.shippingStatusCode,
		orderWeighting: raw.orderWeighting,
		historicalOrder: raw.historicalOrder,
		originalInvoiceDate: raw.originalInvoiceDate,
		customerId: rawCustomer.contactId,
		currency: {
			code: rawCurrency.orderCurrencyCode,
			exchangeRate: rawCurrency.exchangeRate,
			fixedExchangeRate: rawCurrency.fixedExchangeRate,
		},
		total: {
			net: rawTotal.net,
			tax: rawTotal.taxAmount,
			gross: rawTotal.total,
			baseNet: rawTotal.baseNet,
			baseTax: rawTotal.baseTaxAmount,
			baseGross: rawTotal.baseTotal,
		},
		customer: simplifyParty(rawCustomer, { idField: 'id' }),
		billing: simplifyParty(rawBilling, { idField: 'contactId' }),
		delivery: simplifyParty(rawDeliveryParty, {
			extra: {
				date: deliveryMeta.deliveryDate,
				shippingMethodId: deliveryMeta.shippingMethodId,
			},
		}),
		invoice: invoices[0] ?? null,
		rows: Object.entries(rawOrderRows).map(([rowId, row]) =>
			simplifyRow(rowId, row as IDataObject),
		),
	};
}

/**
 * Pull pagination metadata out of the response.metaData block so it can be
 * attached to each returned item as `_pagination`. Lets workflows see total
 * counts and detect more-pages situations without re-querying.
 */
export function extractPaginationMeta(response: IDataObject): IDataObject | undefined {
	const metaData = (response?.response as IDataObject)?.metaData as IDataObject | undefined;
	if (!metaData) return undefined;
	return {
		firstResult: metaData.firstResult,
		lastResult: metaData.lastResult,
		resultsReturned: metaData.resultsReturned,
		resultsAvailable: metaData.resultsAvailable,
		morePagesAvailable: metaData.morePagesAvailable,
	};
}

export async function brightpearlApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	qs: IDataObject = {},
	options: { pageSize?: number; pageDelayMs?: number } = {},
): Promise<IDataObject[]> {
	const allResults: IDataObject[] = [];
	let firstResult = 1;
	const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 200;
	const pageDelayMs = options.pageDelayMs && options.pageDelayMs > 0 ? options.pageDelayMs : 0;
	let hasMore = true;
	let isFirstPage = true;

	while (hasMore) {
		// Proactive pacing between pages — prevents burning through Brightpearl's
		// quota on large fetches and forcing the rate-limit retry loop to absorb
		// 503s. No delay before the first page.
		if (!isFirstPage && pageDelayMs > 0) await sleep(pageDelayMs);
		isFirstPage = false;

		const response = await brightpearlApiRequest.call(this, method, resource, undefined, {
			...qs,
			firstResult,
			pageSize,
		});

		const batch = searchResultsToObjects(response);
		allResults.push(...batch);

		// Brightpearl tells us directly whether there are more pages.
		const metaData = (response?.response as IDataObject)?.metaData as IDataObject | undefined;
		hasMore = (metaData?.morePagesAvailable as boolean) ?? false;
		firstResult += pageSize;
	}

	return allResults;
}
