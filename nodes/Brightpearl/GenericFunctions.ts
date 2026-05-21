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

export async function brightpearlApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body?: IDataObject | IDataObject[],
	qs: IDataObject = {},
	extraHeaders: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('brightpearlApi');

	const options: IHttpRequestOptions = {
		method,
		url: `https://${credentials.datacenter}/public-api/${credentials.accountCode}${resource}`,
		headers: {
			'Content-Type': 'application/json',
			...extraHeaders,
		},
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
				'brightpearlApi',
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
				await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
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

export async function brightpearlApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const allResults: IDataObject[] = [];
	let firstResult = 1;
	const pageSize = 200;
	let hasMore = true;

	while (hasMore) {
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
