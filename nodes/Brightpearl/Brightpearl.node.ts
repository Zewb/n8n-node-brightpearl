import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	JsonObject,
} from 'n8n-workflow';

import {
	brightpearlApiRequest,
	brightpearlApiRequestAllItems,
	consumeTokenRefreshFlag,
	extractPaginationMeta,
	resetTokenRefreshFlag,
	searchResultsToObjects,
	simplifyOrder,
} from './GenericFunctions';

import { orderOperations, orderFields } from './OrderDescription';
import { orderRowOperations, orderRowFields } from './OrderRowDescription';
import { orderNoteOperations, orderNoteFields } from './OrderNoteDescription';
import {
	orderCustomFieldOperations,
	orderCustomFieldFields,
} from './OrderCustomFieldDescription';
import { productOperations, productFields } from './ProductDescription';
import { priceListOperations, priceListFields } from './PriceListDescription';
import { warehouseOperations, warehouseFields } from './WarehouseDescription';
import { contactOperations, contactFields } from './ContactDescription';
import {
	contactCustomFieldOperations,
	contactCustomFieldFields,
} from './ContactCustomFieldDescription';
import { goodsInNoteOperations, goodsInNoteFields } from './GoodsInNoteDescription';
import { goodsOutNoteOperations, goodsOutNoteFields } from './GoodsOutNoteDescription';
import { reservationOperations, reservationFields } from './ReservationDescription';
import { oauthOperations, oauthFields } from './OAuthDescription';

export class Brightpearl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Brightpearl',
		name: 'brightpearl',
		icon: { light: 'file:brightpearl.svg', dark: 'file:brightpearl.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with orders, products, and price lists in Brightpearl',
		defaults: { name: 'Brightpearl' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'brightpearlApi',
				required: true,
				displayOptions: { show: { authentication: ['privateApp'] } },
			},
			{
				name: 'brightpearlOAuth2Api',
				required: true,
				displayOptions: { show: { authentication: ['oauth2'] } },
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'OAuth2',
						value: 'oauth2',
						description: 'Bearer token via OAuth2 authorization code flow (public app)',
					},
					{
						name: 'Private App',
						value: 'privateApp',
						description: 'Three-header authentication (app-ref + account-token + staff-token)',
					},
				],
				default: 'privateApp',
			},
			{
				displayName: 'Include Refresh Metadata in Output',
				name: 'includeRefreshMetadata',
				type: 'boolean',
				default: false,
				displayOptions: { show: { authentication: ['oauth2'] } },
				description:
					'Whether to add `_tokenRefreshed: true/false` to every output item, reflecting whether this execution had to manually refresh the OAuth2 access token. When a refresh fired, also adds `_last401Response` containing Brightpearl\'s complete raw response at expiry — `statusCode` (401 vs 403 vs other), all response `headers` (crucially: whether `www-authenticate` is present, which is what n8n\'s RFC 6750 auto-refresh needs), and the response `body`. Useful for monitoring workflows that count or alert when refreshes happen (expected 0% during the first ~7 days after reconnecting, ~100% thereafter until the next reconnect) and for seeing exactly what Brightpearl sends on expiry. Off by default to keep outputs clean.',
			},
			{
				displayName:
					'Use the n8n HTTP Request node to make custom Brightpearl API calls — pick this credential there and we will handle the auth for you. Important for OAuth2: the HTTP Request node only sends the Bearer token automatically; you must also manually add brightpearl-app-ref and brightpearl-dev-ref under "Send Headers" in the HTTP Request node, otherwise Brightpearl returns 401. For Private App credentials all three headers are sent automatically.',
				name: 'customApiCallNotice',
				type: 'notice',
				default: '',
				displayOptions: { show: { operation: ['customApiCall'] } },
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Contact', value: 'contact' },
					{ name: 'Contact Custom Field', value: 'contactCustomField' },
					{ name: 'Goods In Note', value: 'goodsInNote' },
					{ name: 'Goods Out Note', value: 'goodsOutNote' },
					{ name: 'OAuth Token', value: 'oauth' },
					{ name: 'Order', value: 'order' },
					{ name: 'Order Custom Field', value: 'orderCustomField' },
					{ name: 'Order Note', value: 'orderNote' },
					{ name: 'Order Row', value: 'orderRow' },
					{ name: 'Price List', value: 'priceList' },
					{ name: 'Product', value: 'product' },
					{ name: 'Reservation', value: 'reservation' },
					{ name: 'Warehouse', value: 'warehouse' },
				],
				default: 'order',
			},
			...orderOperations,
			...orderFields,
			...orderRowOperations,
			...orderRowFields,
			...orderNoteOperations,
			...orderNoteFields,
			...orderCustomFieldOperations,
			...orderCustomFieldFields,
			...productOperations,
			...productFields,
			...priceListOperations,
			...priceListFields,
			...warehouseOperations,
			...warehouseFields,
			...contactOperations,
			...contactFields,
			...contactCustomFieldOperations,
			...contactCustomFieldFields,
			...goodsInNoteOperations,
			...goodsInNoteFields,
			...goodsOutNoteOperations,
			...goodsOutNoteFields,
			...reservationOperations,
			...reservationFields,
			...oauthOperations,
			...oauthFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Default to empty strings so getNodeParameter doesn't throw n8n's
		// cryptic "Could not get parameter" error if the saved node state is
		// missing one of these (commonly happens after upgrading the node
		// without a full n8n restart — the schema in memory doesn't match what
		// the running code expects).
		const resource = this.getNodeParameter('resource', 0, '') as string;
		const operation = this.getNodeParameter('operation', 0, '') as string;

		if (!resource || !operation) {
			throw new NodeOperationError(
				this.getNode(),
				`Couldn't read resource (got "${resource}") or operation (got "${operation}") from this node's saved config. This usually means n8n is running cached older code from a previous version. Fully restart your n8n container/process, then re-save the workflow node.`,
			);
		}

		// Pseudo-operation: surfaces a notice telling the user to use the HTTP
		// Request node directly. We don't proxy through to HTTP ourselves —
		// throwing here makes the dropdown choice clearly informational.
		if (operation === 'customApiCall') {
			throw new NodeOperationError(
				this.getNode(),
				'Custom API Call is informational only. Use the n8n HTTP Request node and select this credential there. For OAuth2, remember to add brightpearl-app-ref and brightpearl-dev-ref headers manually in the HTTP Request node.',
			);
		}

		// Read once outside the loop — this is a global node-level setting.
		const includeRefreshMetadata = this.getNodeParameter(
			'includeRefreshMetadata',
			0,
			false,
		) as boolean;

		for (let i = 0; i < items.length; i++) {
			// Clear the per-execution refresh flag before this item's work so
			// `_tokenRefreshed` reflects THIS item's calls, not a prior item's.
			resetTokenRefreshFlag(this);

			try {
				let responseData: IDataObject | IDataObject[];

				// ── ORDERS ────────────────────────────────────────────────────────────
				if (resource === 'order') {
					if (operation === 'get' || operation === 'getViaOrder') {
						const orderId = this.getNodeParameter('orderId', i) as string;
						const simplify = this.getNodeParameter('simplify', i, true) as boolean;

						// Both endpoints accept an ID set (single, range, or comma list) and
						// return { response: [<order>, ...] }. /sales-order/ and /order/ return
						// the same rich nested shape (incl. orderStatus.name).
						const path =
							operation === 'get'
								? `/order-service/sales-order/${orderId}`
								: `/order-service/order/${orderId}`;

						const response = await brightpearlApiRequest.call(this, 'GET', path);

						const raw = response?.response;
						const orders: IDataObject[] = Array.isArray(raw)
							? (raw as IDataObject[])
							: raw
								? [raw as IDataObject]
								: [];

						responseData = simplify
							? orders.map((o) => simplifyOrder(o))
							: orders;

					} else if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						// sales-order-search is already type-scoped — no orderTypeId needed.
						// Filter params MUST match the actual searchable columns Brightpearl
						// exposes for this endpoint (see metaData.columns in any response).
						// Date columns use `column=<from>/<to>` range syntax.
						const qs: IDataObject = {};
						if (filters.salesOrderId) qs.salesOrderId = filters.salesOrderId;
						if (filters.customerId) qs.customerId = filters.customerId;
						if (filters.customerRef) qs.customerRef = filters.customerRef;
						if (filters.externalRef) qs.externalRef = filters.externalRef;
						if (filters.orderStatusId) qs.orderStatusId = filters.orderStatusId;
						if (filters.orderStockStatus) qs.orderStockStatus = filters.orderStockStatus;
						if (filters.orderPaymentStatus) qs.orderPaymentStatus = filters.orderPaymentStatus;
						if (filters.orderShippingStatus)
							qs.orderShippingStatus = filters.orderShippingStatus;
						if (filters.channelId) qs.channelId = filters.channelId;
						if (filters.warehouseId) qs.warehouseId = filters.warehouseId;
						if (filters.staffOwnerId) qs.staffOwnerId = filters.staffOwnerId;
						if (filters.createdById) qs.createdById = filters.createdById;

						const buildRange = (
							from: unknown,
							to: unknown,
						): string | undefined => {
							if (!from && !to) return undefined;
							return `${from ?? ''}/${to ?? ''}`;
						};
						const createdOn = buildRange(filters.createdOnFrom, filters.createdOnTo);
						if (createdOn) qs.createdOn = createdOn;
						const updatedOn = buildRange(filters.updatedOnFrom, filters.updatedOnTo);
						if (updatedOn) qs.updatedOn = updatedOn;
						const taxDate = buildRange(filters.taxDateFrom, filters.taxDateTo);
						if (taxDate) qs.taxDate = taxDate;
						const deliveryDate = buildRange(
							filters.deliveryDateFrom,
							filters.deliveryDateTo,
						);
						if (deliveryDate) qs.deliveryDate = deliveryDate;

						// Columns selection — Brightpearl accepts a comma-separated `columns`
						// query param to restrict the returned column set. Empty = all defaults.
						const columns = this.getNodeParameter('columns', i, []) as string[];
						if (columns.length > 0) qs.columns = columns.join(',');

						// Sort — Brightpearl syntax: `sort=column.DIRECTION` (e.g. createdOn.DESC).
						const sort = this.getNodeParameter('sort', i, {}) as {
							sortBy?: string;
							direction?: string;
						};
						if (sort.sortBy) {
							qs.sort = `${sort.sortBy}.${sort.direction ?? 'ASC'}`;
						}

						let rows: IDataObject[];
						let paginationMeta: IDataObject | undefined;
						if (returnAll) {
							const batching = this.getNodeParameter('batching', i, {}) as {
								pageSize?: number;
								pageDelayMs?: number;
							};
							rows = await brightpearlApiRequestAllItems.call(
								this,
								'GET',
								'/order-service/sales-order-search',
								qs,
								batching,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							const firstResult = this.getNodeParameter('firstResult', i, 1) as number;
							const response = await brightpearlApiRequest.call(
								this,
								'GET',
								'/order-service/sales-order-search',
								undefined,
								{ ...qs, firstResult, pageSize: limit },
							);
							rows = searchResultsToObjects(response);
							paginationMeta = extractPaginationMeta(response);
						}
						responseData = rows.map((r) => ({
							...r,
							...(paginationMeta ? { _pagination: paginationMeta } : {}),
						}));

					} else if (operation === 'searchOrders') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter(
							'searchOrdersFilters',
							i,
						) as IDataObject;

						// /order-service/order-search has a different filterable column set:
						// contactId (not customerId), integer status IDs, orderTypeId,
						// parentOrderId, departmentId, staffOwnerContactId.
						const qs: IDataObject = {};
						if (filters.orderId) qs.orderId = filters.orderId;
						if (filters.orderTypeId) qs.orderTypeId = filters.orderTypeId;
						if (filters.parentOrderId) qs.parentOrderId = filters.parentOrderId;
						if (filters.contactId) qs.contactId = filters.contactId;
						if (filters.customerRef) qs.customerRef = filters.customerRef;
						if (filters.externalRef) qs.externalRef = filters.externalRef;
						if (filters.orderStatusId) qs.orderStatusId = filters.orderStatusId;
						if (filters.orderStockStatusId)
							qs.orderStockStatusId = filters.orderStockStatusId;
						if (filters.orderPaymentStatusId)
							qs.orderPaymentStatusId = filters.orderPaymentStatusId;
						if (filters.orderShippingStatusId)
							qs.orderShippingStatusId = filters.orderShippingStatusId;
						if (filters.warehouseId) qs.warehouseId = filters.warehouseId;
						if (filters.staffOwnerContactId)
							qs.staffOwnerContactId = filters.staffOwnerContactId;
						if (filters.departmentId) qs.departmentId = filters.departmentId;
						if (filters.createdById) qs.createdById = filters.createdById;

						const buildRangeSO = (
							from: unknown,
							to: unknown,
						): string | undefined => {
							if (!from && !to) return undefined;
							return `${from ?? ''}/${to ?? ''}`;
						};
						const createdOnSO = buildRangeSO(
							filters.createdOnFrom,
							filters.createdOnTo,
						);
						if (createdOnSO) qs.createdOn = createdOnSO;
						const updatedOnSO = buildRangeSO(
							filters.updatedOnFrom,
							filters.updatedOnTo,
						);
						if (updatedOnSO) qs.updatedOn = updatedOnSO;
						const taxDateSO = buildRangeSO(filters.taxDateFrom, filters.taxDateTo);
						if (taxDateSO) qs.taxDate = taxDateSO;
						const deliveryDateSO = buildRangeSO(
							filters.deliveryDateFrom,
							filters.deliveryDateTo,
						);
						if (deliveryDateSO) qs.deliveryDate = deliveryDateSO;

						const soColumns = this.getNodeParameter(
							'searchOrdersColumns',
							i,
							[],
						) as string[];
						if (soColumns.length > 0) qs.columns = soColumns.join(',');

						const soSort = this.getNodeParameter('searchOrdersSort', i, {}) as {
							sortBy?: string;
							direction?: string;
						};
						if (soSort.sortBy) {
							qs.sort = `${soSort.sortBy}.${soSort.direction ?? 'ASC'}`;
						}

						let soRows: IDataObject[];
						let soPaginationMeta: IDataObject | undefined;
						if (returnAll) {
							const batching = this.getNodeParameter('batching', i, {}) as {
								pageSize?: number;
								pageDelayMs?: number;
							};
							soRows = await brightpearlApiRequestAllItems.call(
								this,
								'GET',
								'/order-service/order-search',
								qs,
								batching,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							const firstResult = this.getNodeParameter('firstResult', i, 1) as number;
							const response = await brightpearlApiRequest.call(
								this,
								'GET',
								'/order-service/order-search',
								undefined,
								{ ...qs, firstResult, pageSize: limit },
							);
							soRows = searchResultsToObjects(response);
							soPaginationMeta = extractPaginationMeta(response);
						}
						responseData = soRows.map((r) => ({
							...r,
							...(soPaginationMeta ? { _pagination: soPaginationMeta } : {}),
						}));

					} else if (operation === 'create') {
						const contactId = this.getNodeParameter('contactId', i) as number;
						const additional = this.getNodeParameter(
							'orderAdditionalFields',
							i,
						) as IDataObject;
						const rowsInput = this.getNodeParameter('orderRows', i) as {
							row: Array<IDataObject>;
						};

						const body: IDataObject = {
							customer: { id: contactId },
						};

						if (additional.ref) body.ref = additional.ref;
						if (additional.placedOn) body.placedOn = additional.placedOn;
						if (additional.statusId) body.statusId = additional.statusId;
						if (additional.warehouseId) body.warehouseId = additional.warehouseId;
						if (additional.channelId) body.channelId = additional.channelId;
						if (additional.priceListId) body.priceListId = additional.priceListId;
						if (additional.currencyCode) {
							body.currency = { code: additional.currencyCode };
						}

						if (rowsInput.row?.length) {
							body.rows = rowsInput.row.map((row) => {
								const orderRow: IDataObject = {
									productId: row.productId,
									quantity: row.quantity,
								};
								if (row.net !== undefined && row.net !== 0) orderRow.net = row.net;
								if (row.tax !== undefined && row.tax !== 0) orderRow.tax = row.tax;
								if (row.taxCode) orderRow.taxCode = row.taxCode;
								return orderRow;
							});
						}

						const response = await brightpearlApiRequest.call(
							this,
							'POST',
							'/order-service/sales-order',
							body,
						);
						responseData = { orderId: response?.response ?? response };

					} else if (operation === 'updateStatus') {
						const orderId = this.getNodeParameter('orderId', i) as string;
						const newStatusId = this.getNodeParameter('newStatusId', i) as number;
						const opts = this.getNodeParameter(
							'statusUpdateOptions',
							i,
						) as IDataObject;

						const body: IDataObject = { orderStatusId: newStatusId };
						if (opts.noteText) {
							body.orderNote = {
								text: opts.noteText,
								isPublic: opts.noteIsPublic ?? false,
							};
						}

						const response = await brightpearlApiRequest.call(
							this,
							'PUT',
							`/order-service/order/${orderId}/status`,
							body,
						);
						responseData = (response?.response as IDataObject) ?? { success: true };

					} else if (operation === 'updateOrder') {
						const orderId = this.getNodeParameter('orderId', i) as string;
						const rawPatch = this.getNodeParameter('orderRawPatch', i) as
							| string
							| IDataObject[];
						let parsed: unknown = rawPatch;
						if (typeof rawPatch === 'string') {
							try {
								parsed = JSON.parse(rawPatch);
							} catch (err) {
								throw new NodeOperationError(
									this.getNode(),
									`Invalid JSON Patch: ${(err as Error).message}`,
									{ itemIndex: i },
								);
							}
						}
						if (!Array.isArray(parsed)) {
							throw new NodeOperationError(
								this.getNode(),
								'JSON Patch must be an array of operations',
								{ itemIndex: i },
							);
						}
						const response = await brightpearlApiRequest.call(
							this,
							'PATCH',
							`/order-service/order/${orderId}`,
							parsed as unknown as IDataObject[],
							{},
							{ 'Content-Type': 'application/json-patch+json' },
						);
						responseData = {
							orderId,
							patched: parsed,
							response: response?.response ?? null,
						};

					} else {
						throw new NodeOperationError(this.getNode(), `Unknown order operation: ${operation}`, { itemIndex: i });
					}

				// ── PRODUCTS ──────────────────────────────────────────────────────────
				} else if (resource === 'product') {
					if (operation === 'get') {
						const productId = this.getNodeParameter('productId', i) as number;
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							`/product-service/product/${productId}`,
						);
						responseData = (response?.response as IDataObject) ?? response;

					} else if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						const qs: IDataObject = {};
						// UI field names match Brightpearl product-search column names directly.
						// Booleans are explicitly stringified to "true"/"false" so the URL
						// serializer can't drop or recast them on the wire.
						if (filters.productId) qs.productId = filters.productId;
						if (filters.productName) qs.productName = filters.productName;
						if (filters.SKU) qs.SKU = filters.SKU;
						if (filters.barcode) qs.barcode = filters.barcode;
						if (filters.EAN) qs.EAN = filters.EAN;
						if (filters.UPC) qs.UPC = filters.UPC;
						if (filters.ISBN) qs.ISBN = filters.ISBN;
						if (filters.MPN) qs.MPN = filters.MPN;
						if (filters.brandId) qs.brandId = filters.brandId;
						if (filters.brightpearlCategoryCode)
							qs.brightpearlCategoryCode = filters.brightpearlCategoryCode;
						if (filters.productTypeId) qs.productTypeId = filters.productTypeId;
						if (filters.productGroupId) qs.productGroupId = filters.productGroupId;
						if (filters.primarySupplierId)
							qs.primarySupplierId = filters.primarySupplierId;
						if (filters.productStatus) qs.productStatus = filters.productStatus;
						if (filters.salesChannelName)
							qs.salesChannelName = filters.salesChannelName;
						if (filters.stockTracked !== undefined) {
							qs.stockTracked = filters.stockTracked === true ? 'true' : 'false';
						}

						const buildRangeP = (
							from: unknown,
							to: unknown,
						): string | undefined => {
							if (!from && !to) return undefined;
							return `${from ?? ''}/${to ?? ''}`;
						};
						const pCreatedOn = buildRangeP(filters.createdOnFrom, filters.createdOnTo);
						if (pCreatedOn) qs.createdOn = pCreatedOn;
						const pUpdatedOn = buildRangeP(filters.updatedOnFrom, filters.updatedOnTo);
						if (pUpdatedOn) qs.updatedOn = pUpdatedOn;

						const productColumns = this.getNodeParameter(
							'productColumns',
							i,
							[],
						) as string[];
						if (productColumns.length > 0) qs.columns = productColumns.join(',');

						const productSort = this.getNodeParameter('productSort', i, {}) as {
							sortBy?: string;
							direction?: string;
						};
						if (productSort.sortBy) {
							qs.sort = `${productSort.sortBy}.${productSort.direction ?? 'ASC'}`;
						}

						let productRows: IDataObject[];
						let productPaginationMeta: IDataObject | undefined;
						if (returnAll) {
							const batching = this.getNodeParameter('batching', i, {}) as {
								pageSize?: number;
								pageDelayMs?: number;
							};
							productRows = await brightpearlApiRequestAllItems.call(
								this,
								'GET',
								'/product-service/product-search',
								qs,
								batching,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							const firstResult = this.getNodeParameter('firstResult', i, 1) as number;
							const response = await brightpearlApiRequest.call(
								this,
								'GET',
								'/product-service/product-search',
								undefined,
								{ ...qs, firstResult, pageSize: limit },
							);
							productRows = searchResultsToObjects(response);
							productPaginationMeta = extractPaginationMeta(response);
						}
						responseData = productRows.map((r) => ({
							...r,
							...(productPaginationMeta
								? { _pagination: productPaginationMeta }
								: {}),
						}));

					} else if (operation === 'create') {
						const productName = this.getNodeParameter('productName', i) as string;
						const additional = this.getNodeParameter(
							'productAdditionalFields',
							i,
						) as IDataObject;

						const body: IDataObject = {
							salesChannels: [
								{
									salesChannelName: 'Brightpearl',
									productName,
									...(additional.shortDescription
										? { shortDescription: additional.shortDescription }
										: {}),
									...(additional.category
										? { categories: [additional.category] }
										: {}),
								},
							],
							identity: {
								...(additional.sku ? { sku: additional.sku } : {}),
								...(additional.ean ? { ean: additional.ean } : {}),
								...(additional.barcode ? { barcode: additional.barcode } : {}),
							},
							stock: { stockTracked: additional.stockTracked ?? true },
						};

						if (additional.brandId) body.brandId = additional.brandId;
						if (additional.taxCodeId) {
							body.financialDetails = {
								taxCode: { id: additional.taxCodeId },
							};
						}

						const response = await brightpearlApiRequest.call(
							this,
							'POST',
							'/product-service/product',
							body,
						);
						responseData = { productId: response?.response ?? response };

					} else {
						throw new NodeOperationError(this.getNode(), `Unknown product operation: ${operation}`, { itemIndex: i });
					}

				// ── PRICE LISTS ───────────────────────────────────────────────────────
				} else if (resource === 'priceList') {
					if (operation === 'getAll') {
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							'/product-service/price-list',
						);
						const lists = response?.response;
						responseData = Array.isArray(lists) ? lists : [lists as IDataObject];

					} else if (operation === 'getPrices') {
						const productId = this.getNodeParameter('productId', i) as number;
						const priceListId = this.getNodeParameter('priceListId', i) as number;
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							`/product-service/product-price/${productId}/price-list/${priceListId}`,
						);
						const prices = response?.response;
						responseData = Array.isArray(prices)
							? prices
							: [prices as IDataObject];

					} else if (operation === 'setPrice') {
						const productId = this.getNodeParameter('productId', i) as number;
						const priceListId = this.getNodeParameter('priceListId', i) as number;
						const basePrice = this.getNodeParameter('basePrice', i) as number;
						const sku = this.getNodeParameter('sku', i) as string;
						const breaksInput = this.getNodeParameter('quantityPriceBreaks', i) as {
							break: Array<{ minQuantity: number; price: number }>;
						};

						const quantityPrice: Record<string, string> = {
							'1': String(basePrice),
						};
						for (const b of breaksInput.break ?? []) {
							quantityPrice[String(b.minQuantity)] = String(b.price);
						}

						const priceEntry: IDataObject = {
							priceListId,
							quantityPrice,
						};
						if (sku) priceEntry.sku = sku;

						const response = await brightpearlApiRequest.call(
							this,
							'PUT',
							`/product-service/product-price/${productId}/price-list`,
							{ priceLists: [priceEntry] },
						);
						responseData = (response?.response as IDataObject) ?? { success: true };

					} else {
						throw new NodeOperationError(this.getNode(), `Unknown priceList operation: ${operation}`, { itemIndex: i });
					}

				// ── ORDER ROW ─────────────────────────────────────────────────────────
				} else if (resource === 'orderRow') {
					if (operation === 'create') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const productId = this.getNodeParameter('productId', i) as number;
						const quantity = this.getNodeParameter('quantity', i) as number;
						const additional = this.getNodeParameter(
							'rowAdditional',
							i,
							{},
						) as IDataObject;

						// Brightpearl expects nested objects for money/quantity fields on
						// the /order/{id}/row endpoint, matching the response shape:
						//   quantity      -> { magnitude: "24.0000" }
						//   itemCost      -> { currencyCode, value }
						//   productPrice  -> { currencyCode, value }  (currencyCode inherited from the order if omitted)
						//   rowValue.rowNet / rowValue.rowTax -> { currencyCode, value }
						const body: IDataObject = {
							productId,
							quantity: { magnitude: String(quantity) },
						};
						if (additional.productPrice !== undefined) {
							body.productPrice = { value: String(additional.productPrice) };
						}
						if (additional.taxCode) body.taxCode = additional.taxCode;
						if (additional.nominalCode) body.nominalCode = additional.nominalCode;
						if (additional.discountPercentage !== undefined)
							body.discountPercentage = additional.discountPercentage;
						// rowValue holds the row-level money/tax details.
						const rowValue: IDataObject = {};
						if (additional.net !== undefined) {
							rowValue.rowNet = { value: String(additional.net) };
						}
						if (additional.tax !== undefined) {
							rowValue.rowTax = { value: String(additional.tax) };
						}
						if (additional.taxCode) rowValue.taxCode = additional.taxCode;
						if (Object.keys(rowValue).length > 0) body.rowValue = rowValue;

						const response = await brightpearlApiRequest.call(
							this,
							'POST',
							`/order-service/order/${orderId}/row`,
							body,
						);
						responseData = {
							orderId,
							rowId: response?.response ?? null,
						};

					} else if (operation === 'update') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const rowId = this.getNodeParameter('rowId', i) as number;
						const rawPatch = this.getNodeParameter('rowRawPatch', i) as
							| string
							| IDataObject[];
						let parsed: unknown = rawPatch;
						if (typeof rawPatch === 'string') {
							try {
								parsed = JSON.parse(rawPatch);
							} catch (err) {
								throw new NodeOperationError(
									this.getNode(),
									`Invalid JSON Patch: ${(err as Error).message}`,
									{ itemIndex: i },
								);
							}
						}
						if (!Array.isArray(parsed)) {
							throw new NodeOperationError(
								this.getNode(),
								'JSON Patch must be an array of operations',
								{ itemIndex: i },
							);
						}
						const response = await brightpearlApiRequest.call(
							this,
							'PATCH',
							`/order-service/order/${orderId}/row/${rowId}`,
							parsed as unknown as IDataObject[],
							{},
							{ 'Content-Type': 'application/json-patch+json' },
						);
						responseData = {
							orderId,
							rowId,
							patched: parsed,
							response: response?.response ?? null,
						};

					} else if (operation === 'delete') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const rowId = this.getNodeParameter('rowId', i) as number;
						await brightpearlApiRequest.call(
							this,
							'DELETE',
							`/order-service/order/${orderId}/row/${rowId}`,
						);
						responseData = { orderId, rowId, deleted: true };

					} else {
						throw new NodeOperationError(
							this.getNode(),
							`Unknown orderRow operation: ${operation}`,
							{ itemIndex: i },
						);
					}

				// ── ORDER NOTE ────────────────────────────────────────────────────────
				} else if (resource === 'orderNote') {
					if (operation === 'create') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const text = this.getNodeParameter('noteText', i) as string;
						const additional = this.getNodeParameter(
							'addNoteAdditional',
							i,
							{},
						) as IDataObject;

						const body: IDataObject = { text };
						if (additional.isPublic !== undefined) body.isPublic = additional.isPublic;
						if (additional.contactId) body.contactId = additional.contactId;
						if (additional.fileId) body.fileId = additional.fileId;
						if (additional.addedOn) body.addedOn = additional.addedOn;

						const response = await brightpearlApiRequest.call(
							this,
							'POST',
							`/order-service/order/${orderId}/note`,
							body,
						);
						const respBody = response?.response;
						responseData = {
							orderId,
							noteId: Array.isArray(respBody) ? respBody[0] : respBody,
						};

					} else {
						throw new NodeOperationError(
							this.getNode(),
							`Unknown orderNote operation: ${operation}`,
							{ itemIndex: i },
						);
					}

				// ── ORDER CUSTOM FIELD ────────────────────────────────────────────────
				} else if (resource === 'orderCustomField') {
					if (operation === 'getMetadata') {
						const metaOrderType = this.getNodeParameter('metaOrderType', i) as string;
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							`/order-service/${metaOrderType}/custom-field-meta-data`,
						);
						// Response is keyed by field ID: { response: { "5": {...}, "6": {...} } }.
						// Emit each field definition as its own item for easy browsing/mapping.
						const meta = response?.response;
						if (Array.isArray(meta)) {
							responseData = meta as IDataObject[];
						} else if (meta && typeof meta === 'object') {
							responseData = Object.values(meta as IDataObject) as IDataObject[];
						} else {
							responseData = [];
						}

					} else if (operation === 'get') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							`/order-service/order/${orderId}/custom-field`,
						);
						const fields = (response?.response as IDataObject) ?? {};
						responseData = { orderId, ...fields };

					} else if (operation === 'update') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const inputMode = this.getNodeParameter(
							'customFieldInputMode',
							i,
							'fields',
						) as string;

						let patchOps: IDataObject[];
						const skippedCodes: string[] = [];

						if (inputMode === 'raw') {
							const rawPatch = this.getNodeParameter('customFieldRawPatch', i) as
								| string
								| IDataObject[];
							let parsed: unknown = rawPatch;
							if (typeof rawPatch === 'string') {
								try {
									parsed = JSON.parse(rawPatch);
								} catch (err) {
									throw new NodeOperationError(
										this.getNode(),
										`Invalid JSON Patch: ${(err as Error).message}. Toggle expression mode on the field; remember unquoted {{ expr }} for booleans/numbers, quoted "{{ expr }}" for strings.`,
										{ itemIndex: i },
									);
								}
							}
							if (!Array.isArray(parsed)) {
								throw new NodeOperationError(
									this.getNode(),
									'JSON Patch must be an array of operations',
									{ itemIndex: i },
								);
							}
							patchOps = parsed as IDataObject[];
						} else {
							const cfInput = this.getNodeParameter('customFields', i) as {
								field: Array<{
									op?: 'add' | 'replace' | 'remove';
									code: string;
									value?: unknown;
									valueType?: 'text' | 'number' | 'boolean' | 'select';
								}>;
							};

							if (!cfInput.field?.length) {
								throw new NodeOperationError(
									this.getNode(),
									'At least one custom field must be provided',
									{ itemIndex: i },
								);
							}

							const coerce = (
								raw: unknown,
								type?: string,
							): string | number | boolean | IDataObject => {
								if (type === 'number') return Number(raw);
								if (type === 'boolean') {
									if (typeof raw === 'boolean') return raw;
									if (typeof raw === 'number') return raw !== 0;
									return String(raw ?? '').trim().toLowerCase() === 'true';
								}
								if (type === 'select') return { id: Number(raw) };
								return String(raw ?? '');
							};

							// Add / Replace ops with null / undefined / empty string
							// values are silently dropped — this lets workflows use
							// {{ $json.someDate }} expressions that may resolve to null
							// without failing the whole PATCH. Remove ops always keep.
							patchOps = cfInput.field.reduce<IDataObject[]>((acc, f) => {
								const op = f.op ?? 'add';
								if (op === 'remove') {
									acc.push({ op: 'remove', path: `/${f.code}` });
									return acc;
								}
								if (f.value === null || f.value === undefined || f.value === '') {
									skippedCodes.push(f.code);
									return acc;
								}
								acc.push({
									op,
									path: `/${f.code}`,
									value: coerce(f.value, f.valueType),
								});
								return acc;
							}, []);
						}

						// Uniform empty-check across both modes: skip the API call
						// entirely and return a diagnostic so the workflow can continue.
						if (patchOps.length === 0) {
							responseData = {
								orderId,
								patched: [],
								skipped: skippedCodes,
								response: null,
								note: 'No custom field entries to apply — nothing sent to Brightpearl',
							};
						} else {
							const response = await brightpearlApiRequest.call(
								this,
								'PATCH',
								`/order-service/order/${orderId}/custom-field`,
								patchOps as unknown as IDataObject[],
								{},
								{ 'Content-Type': 'application/json-patch+json' },
							);
							responseData = {
								orderId,
								patched: patchOps,
								response: response?.response ?? null,
							};
						}

					} else {
						throw new NodeOperationError(
							this.getNode(),
							`Unknown orderCustomField operation: ${operation}`,
							{ itemIndex: i },
						);
					}

				// ── WAREHOUSE ─────────────────────────────────────────────────────────
				} else if (resource === 'warehouse') {
					if (operation === 'getMany') {
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							'/warehouse-service/warehouse',
						);
						const warehouses = response?.response;
						responseData = Array.isArray(warehouses)
							? warehouses
							: [warehouses as IDataObject];

					} else if (operation === 'getAvailability') {
						const productIds = this.getNodeParameter('productIds', i) as string;
						const warehouseId = this.getNodeParameter(
							'availabilityWarehouseId',
							i,
							0,
						) as number;
						const includeOptional = this.getNodeParameter(
							'includeOptional',
							i,
							[],
						) as string[];

						// Always the same endpoint — Brightpearl doesn't expose a per-warehouse
						// path. Optional richness is requested via `?includeOptional=...`.
						// When the user asks to filter to a specific warehouse, force-include
						// breakDownByLocation so we have per-warehouse data to filter on.
						const wantsWarehouseFilter = warehouseId && warehouseId > 0;
						const includeSet = new Set<string>(includeOptional);
						if (wantsWarehouseFilter) includeSet.add('breakDownByLocation');

						const qs: IDataObject = {};
						if (includeSet.size > 0) {
							qs.includeOptional = Array.from(includeSet).join(',');
						}

						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							`/warehouse-service/product-availability/${productIds}`,
							undefined,
							qs,
						);

						// Response is keyed by product ID; flatten to one item per product
						// with productId baked in. If the user requested a warehouse filter,
						// strip out other warehouses from each item's `warehouses` block.
						const raw = (response?.response as IDataObject) ?? {};
						const items: IDataObject[] = Array.isArray(raw)
							? (raw as IDataObject[])
							: Object.entries(raw).map(([productId, data]) => ({
									productId: Number(productId),
									...(data as IDataObject),
								}));

						if (wantsWarehouseFilter) {
							const targetKey = String(warehouseId);
							responseData = items.map((item) => {
								const warehouses = item.warehouses as IDataObject | undefined;
								if (!warehouses || typeof warehouses !== 'object') return item;
								const matched = warehouses[targetKey];
								return {
									...item,
									warehouses:
										matched !== undefined ? { [targetKey]: matched } : {},
								};
							});
						} else {
							responseData = items;
						}

					} else {
						throw new NodeOperationError(
							this.getNode(),
							`Unknown warehouse operation: ${operation}`,
							{ itemIndex: i },
						);
					}

				// ── CONTACT ───────────────────────────────────────────────────────────
				} else if (resource === 'contact') {
					if (operation === 'get') {
						const contactIdParam = this.getNodeParameter('contactId', i) as string;
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							`/contact-service/contact/${contactIdParam}`,
						);
						const raw = response?.response;
						responseData = Array.isArray(raw)
							? (raw as IDataObject[])
							: raw
								? [raw as IDataObject]
								: [];

					} else if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter(
							'contactFilters',
							i,
						) as IDataObject;

						const qs: IDataObject = {};
						if (filters.contactId) qs.contactId = filters.contactId;
						if (filters.firstName) qs.firstName = filters.firstName;
						if (filters.lastName) qs.lastName = filters.lastName;
						if (filters.companyName) qs.companyName = filters.companyName;
						if (filters.exactCompanyName)
							qs.exactCompanyName = filters.exactCompanyName;
						if (filters.primaryEmail) qs.primaryEmail = filters.primaryEmail;
						if (filters.secondaryEmail) qs.secondaryEmail = filters.secondaryEmail;
						if (filters.tertiaryEmail) qs.tertiaryEmail = filters.tertiaryEmail;
						if (filters.pri) qs.pri = filters.pri;
						if (filters.sec) qs.sec = filters.sec;
						if (filters.mob) qs.mob = filters.mob;
						if (filters.title) qs.title = filters.title;
						if (filters.nominalCode) qs.nominalCode = filters.nominalCode;

						// Booleans — stringify so the URL serializer can't drop them.
						const boolField = (
							key: 'isCustomer' | 'isSupplier' | 'isStaff' | 'isPrimary',
						) => {
							if (filters[key] !== undefined) {
								qs[key] = filters[key] === true ? 'true' : 'false';
							}
						};
						boolField('isCustomer');
						boolField('isSupplier');
						boolField('isStaff');
						boolField('isPrimary');

						const buildRangeC = (
							from: unknown,
							to: unknown,
						): string | undefined => {
							if (!from && !to) return undefined;
							return `${from ?? ''}/${to ?? ''}`;
						};
						const cCreatedOn = buildRangeC(filters.createdOnFrom, filters.createdOnTo);
						if (cCreatedOn) qs.createdOn = cCreatedOn;
						const cUpdatedOn = buildRangeC(filters.updatedOnFrom, filters.updatedOnTo);
						if (cUpdatedOn) qs.updatedOn = cUpdatedOn;
						const cLastContacted = buildRangeC(
							filters.lastContactedOnFrom,
							filters.lastContactedOnTo,
						);
						if (cLastContacted) qs.lastContactedOn = cLastContacted;
						const cLastOrdered = buildRangeC(
							filters.lastOrderedOnFrom,
							filters.lastOrderedOnTo,
						);
						if (cLastOrdered) qs.lastOrderedOn = cLastOrdered;

						const contactCols = this.getNodeParameter(
							'contactColumns',
							i,
							[],
						) as string[];
						if (contactCols.length > 0) qs.columns = contactCols.join(',');

						const contactSort = this.getNodeParameter('contactSort', i, {}) as {
							sortBy?: string;
							direction?: string;
						};
						if (contactSort.sortBy) {
							qs.sort = `${contactSort.sortBy}.${contactSort.direction ?? 'ASC'}`;
						}

						let contactRows: IDataObject[];
						let contactPaginationMeta: IDataObject | undefined;
						if (returnAll) {
							const batching = this.getNodeParameter('batching', i, {}) as {
								pageSize?: number;
								pageDelayMs?: number;
							};
							contactRows = await brightpearlApiRequestAllItems.call(
								this,
								'GET',
								'/contact-service/contact-search',
								qs,
								batching,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							const firstResult = this.getNodeParameter('firstResult', i, 1) as number;
							const response = await brightpearlApiRequest.call(
								this,
								'GET',
								'/contact-service/contact-search',
								undefined,
								{ ...qs, firstResult, pageSize: limit },
							);
							contactRows = searchResultsToObjects(response);
							contactPaginationMeta = extractPaginationMeta(response);
						}
						responseData = contactRows.map((r) => ({
							...r,
							...(contactPaginationMeta
								? { _pagination: contactPaginationMeta }
								: {}),
						}));

					} else {
						throw new NodeOperationError(
							this.getNode(),
							`Unknown contact operation: ${operation}`,
							{ itemIndex: i },
						);
					}

				// ── CONTACT CUSTOM FIELD ──────────────────────────────────────────────
				} else if (resource === 'contactCustomField') {
					if (operation === 'getMetadata') {
						const metaContactType = this.getNodeParameter(
							'metaContactType',
							i,
						) as string;
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							`/contact-service/${metaContactType}/custom-field-meta-data`,
						);
						// Response is keyed by field ID: { response: { "5": {...}, "6": {...} } }.
						// Emit each field definition as its own item.
						const meta = response?.response;
						if (Array.isArray(meta)) {
							responseData = meta as IDataObject[];
						} else if (meta && typeof meta === 'object') {
							responseData = Object.values(meta as IDataObject) as IDataObject[];
						} else {
							responseData = [];
						}

					} else if (operation === 'get') {
						const contactIdParam = this.getNodeParameter('contactId', i) as number;
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							`/contact-service/contact/${contactIdParam}/custom-field`,
						);
						const fields = (response?.response as IDataObject) ?? {};
						responseData = { contactId: contactIdParam, ...fields };

					} else if (operation === 'update') {
						const contactIdParam = this.getNodeParameter('contactId', i) as number;
						const inputMode = this.getNodeParameter(
							'customFieldInputMode',
							i,
							'fields',
						) as string;

						let patchOps: IDataObject[];
						const skippedCodes: string[] = [];

						if (inputMode === 'raw') {
							const rawPatch = this.getNodeParameter('customFieldRawPatch', i) as
								| string
								| IDataObject[];
							let parsed: unknown = rawPatch;
							if (typeof rawPatch === 'string') {
								try {
									parsed = JSON.parse(rawPatch);
								} catch (err) {
									throw new NodeOperationError(
										this.getNode(),
										`Invalid JSON Patch: ${(err as Error).message}. Toggle expression mode on the field; remember unquoted {{ expr }} for booleans/numbers, quoted "{{ expr }}" for strings.`,
										{ itemIndex: i },
									);
								}
							}
							if (!Array.isArray(parsed)) {
								throw new NodeOperationError(
									this.getNode(),
									'JSON Patch must be an array of operations',
									{ itemIndex: i },
								);
							}
							patchOps = parsed as IDataObject[];
						} else {
							const cfInput = this.getNodeParameter('customFields', i) as {
								field: Array<{
									op?: 'add' | 'replace' | 'remove';
									code: string;
									value?: unknown;
									valueType?: 'text' | 'number' | 'boolean' | 'select';
								}>;
							};

							if (!cfInput.field?.length) {
								throw new NodeOperationError(
									this.getNode(),
									'At least one custom field must be provided',
									{ itemIndex: i },
								);
							}

							const coerce = (
								raw: unknown,
								type?: string,
							): string | number | boolean | IDataObject => {
								if (type === 'number') return Number(raw);
								if (type === 'boolean') {
									if (typeof raw === 'boolean') return raw;
									if (typeof raw === 'number') return raw !== 0;
									return String(raw ?? '').trim().toLowerCase() === 'true';
								}
								if (type === 'select') return { id: Number(raw) };
								return String(raw ?? '');
							};

							// Same auto-skip behavior as Order Custom Field: drop
							// add/replace entries whose value is null/undefined/empty
							// string so expressions that resolve to null don't blow up
							// the whole PATCH. Remove ops always keep.
							patchOps = cfInput.field.reduce<IDataObject[]>((acc, f) => {
								const op = f.op ?? 'add';
								if (op === 'remove') {
									acc.push({ op: 'remove', path: `/${f.code}` });
									return acc;
								}
								if (f.value === null || f.value === undefined || f.value === '') {
									skippedCodes.push(f.code);
									return acc;
								}
								acc.push({
									op,
									path: `/${f.code}`,
									value: coerce(f.value, f.valueType),
								});
								return acc;
							}, []);
						}

						if (patchOps.length === 0) {
							responseData = {
								contactId: contactIdParam,
								patched: [],
								skipped: skippedCodes,
								response: null,
								note: 'No custom field entries to apply — nothing sent to Brightpearl',
							};
						} else {
							const response = await brightpearlApiRequest.call(
								this,
								'PATCH',
								`/contact-service/contact/${contactIdParam}/custom-field`,
								patchOps as unknown as IDataObject[],
								{},
								{ 'Content-Type': 'application/json-patch+json' },
							);
							responseData = {
								contactId: contactIdParam,
								patched: patchOps,
								response: response?.response ?? null,
							};
						}

					} else {
						throw new NodeOperationError(
							this.getNode(),
							`Unknown contactCustomField operation: ${operation}`,
							{ itemIndex: i },
						);
					}

				// ── GOODS IN NOTE ─────────────────────────────────────────────────────
				} else if (resource === 'goodsInNote') {
					if (operation === 'create') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const warehouseId = this.getNodeParameter('warehouseId', i) as number;
						const rowsInput = this.getNodeParameter('goodsInRows', i) as {
							row: Array<{
								orderRowId: number;
								quantity: number;
								batchNumber?: string;
								expiryDate?: string;
							}>;
						};
						const additional = this.getNodeParameter(
							'goodsInAdditional',
							i,
							{},
						) as IDataObject;

						if (!rowsInput.row?.length) {
							throw new NodeOperationError(
								this.getNode(),
								'At least one row is required for a goods-in note',
								{ itemIndex: i },
							);
						}

						// Brightpearl shape: goodsInNoteRows is an object keyed by
						// order-row ID, each value an array of allocation entries.
						// Multiple rows for the same order-row ID (e.g. batches) are
						// collapsed into the same array.
						const goodsInNoteRows: IDataObject = {};
						for (const r of rowsInput.row) {
							const entry: IDataObject = { quantity: r.quantity };
							if (r.batchNumber) entry.batchNumber = r.batchNumber;
							if (r.expiryDate) entry.expiryDate = r.expiryDate;
							const key = String(r.orderRowId);
							if (!goodsInNoteRows[key]) goodsInNoteRows[key] = [];
							(goodsInNoteRows[key] as IDataObject[]).push(entry);
						}

						const body: IDataObject = {
							warehouseId,
							goodsInNoteRows,
						};
						if (additional.ref) body.ref = additional.ref;
						if (additional.parentNodeId) body.parentNodeId = additional.parentNodeId;
						if (additional.transferId) body.transferId = additional.transferId;
						if (additional.released !== undefined) body.released = additional.released;
						if (additional.priority !== undefined) body.priority = additional.priority;

						const response = await brightpearlApiRequest.call(
							this,
							'POST',
							`/warehouse-service/order/${orderId}/goods-note/goods-in`,
							body,
						);
						responseData = {
							orderId,
							goodsInNoteId: response?.response ?? null,
						};

					} else if (operation === 'get') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const goodsInNoteId = this.getNodeParameter('goodsInNoteId', i) as string;
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							`/warehouse-service/order/${orderId}/goods-note/goods-in/${goodsInNoteId}`,
						);
						const notes = response?.response;
						responseData = Array.isArray(notes)
							? (notes as IDataObject[])
							: [notes as IDataObject];

					} else if (operation === 'delete') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const goodsInNoteIdSingle = this.getNodeParameter(
							'goodsInNoteIdSingle',
							i,
						) as number;
						await brightpearlApiRequest.call(
							this,
							'DELETE',
							`/warehouse-service/order/${orderId}/goods-note/goods-in/${goodsInNoteIdSingle}`,
						);
						responseData = {
							orderId,
							deletedGoodsInNoteId: goodsInNoteIdSingle,
							deleted: true,
						};

					} else if (operation === 'search') {
						const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						const qs: IDataObject = { ...filters };
						if (!returnAll) {
							const pageSize = this.getNodeParameter('pageSize', i, 100) as number;
							const firstResult = this.getNodeParameter('firstResult', i, 1) as number;
							qs.pageSize = pageSize;
							qs.firstResult = firstResult;
						}
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							'/warehouse-service/goods-in-search',
							undefined,
							qs,
						);
						const rows = searchResultsToObjects(response);
						responseData = rows;

					} else {
						throw new NodeOperationError(
							this.getNode(),
							`Unknown goodsInNote operation: ${operation}`,
							{ itemIndex: i },
						);
					}

				// ── GOODS OUT NOTE ────────────────────────────────────────────────────
				} else if (resource === 'goodsOutNote') {
					if (operation === 'create') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const warehouseId = this.getNodeParameter('warehouseId', i) as number;
						const releaseDate = this.getNodeParameter('releaseDate', i, '') as string;
						const rowsInput = this.getNodeParameter('goodsOutRows', i) as {
							row: Array<{ orderRowId: number; quantity: number }>;
						};
						const additional = this.getNodeParameter(
							'goodsOutAdditional',
							i,
							{},
						) as IDataObject;

						if (!rowsInput.row?.length) {
							throw new NodeOperationError(
								this.getNode(),
								'At least one row is required for a goods-out note',
								{ itemIndex: i },
							);
						}

						// Shape: orderRows keyed by order-row ID, each value an array
						// of allocation objects. Even single-allocation rows need the
						// array wrapper per Brightpearl's schema.
						const orderRows: IDataObject = {};
						for (const r of rowsInput.row) {
							const key = String(r.orderRowId);
							if (!orderRows[key]) orderRows[key] = [];
							(orderRows[key] as IDataObject[]).push({ quantity: r.quantity });
						}

						const body: IDataObject = {
							warehouseId,
							orderRows,
						};
						if (releaseDate) body.releaseDate = releaseDate;
						if (additional.priority !== undefined) body.priority = additional.priority;
						if (additional.transfer !== undefined) body.transfer = additional.transfer;
						if (additional.labelUri) body.labelUri = additional.labelUri;

						// Carrier block: only include if the user supplied at least one carrier field.
						if (additional.carrierName || additional.carrierReference || additional.boxes) {
							const carrier: IDataObject = {};
							if (additional.carrierName) carrier.name = additional.carrierName;
							if (additional.carrierReference) carrier.reference = additional.carrierReference;
							if (additional.boxes) carrier.boxes = additional.boxes;
							body.carrier = carrier;
						}

						const response = await brightpearlApiRequest.call(
							this,
							'POST',
							`/warehouse-service/order/${orderId}/goods-note/goods-out`,
							body,
						);
						responseData = {
							orderId,
							goodsOutNoteId: response?.response ?? null,
						};

					} else if (operation === 'get') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const goodsOutNoteId = this.getNodeParameter('goodsOutNoteId', i) as string;
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							`/warehouse-service/order/${orderId}/goods-note/goods-out/${goodsOutNoteId}`,
						);
						const notes = response?.response;
						responseData = Array.isArray(notes)
							? (notes as IDataObject[])
							: [notes as IDataObject];

					} else if (operation === 'delete') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const goodsOutNoteIdSingle = this.getNodeParameter(
							'goodsOutNoteIdSingle',
							i,
						) as number;
						await brightpearlApiRequest.call(
							this,
							'DELETE',
							`/warehouse-service/order/${orderId}/goods-note/goods-out/${goodsOutNoteIdSingle}`,
						);
						responseData = {
							orderId,
							deletedGoodsOutNoteId: goodsOutNoteIdSingle,
							deleted: true,
						};

					} else if (operation === 'markEvent') {
						const goodsOutNoteIdForEvent = this.getNodeParameter(
							'goodsOutNoteIdForEvent',
							i,
						) as number;
						const eventCode = this.getNodeParameter('eventCode', i) as string;
						const eventOccurred = this.getNodeParameter(
							'eventOccurred',
							i,
							'',
						) as string;
						const eventOwnerId = this.getNodeParameter(
							'eventOwnerId',
							i,
							0,
						) as number;
						const eventDetail = this.getNodeParameter(
							'eventDetail',
							i,
							'',
						) as string;

						const body: IDataObject = {
							eventCode,
							occurred: eventOccurred || new Date().toISOString(),
						};
						if (eventOwnerId) body.eventOwnerId = eventOwnerId;
						if (eventDetail) body.eventDetail = eventDetail;

						const response = await brightpearlApiRequest.call(
							this,
							'POST',
							`/warehouse-service/goods-note/goods-out/${goodsOutNoteIdForEvent}/event`,
							body,
						);
						responseData = {
							goodsOutNoteId: goodsOutNoteIdForEvent,
							eventCode,
							response: response?.response ?? null,
						};

					} else if (operation === 'search') {
						const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						const qs: IDataObject = { ...filters };
						if (!returnAll) {
							const pageSize = this.getNodeParameter('pageSize', i, 100) as number;
							const firstResult = this.getNodeParameter('firstResult', i, 1) as number;
							qs.pageSize = pageSize;
							qs.firstResult = firstResult;
						}
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							'/warehouse-service/goods-out-search',
							undefined,
							qs,
						);
						responseData = searchResultsToObjects(response);

					} else {
						throw new NodeOperationError(
							this.getNode(),
							`Unknown goodsOutNote operation: ${operation}`,
							{ itemIndex: i },
						);
					}

				// ── RESERVATION ───────────────────────────────────────────────────────
				} else if (resource === 'reservation') {
					if (operation === 'create') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const warehouseId = this.getNodeParameter('warehouseId', i) as number;
						const rowsInput = this.getNodeParameter('reservationRows', i) as {
							row: Array<{ orderRowId: number; quantity: number }>;
						};

						if (!rowsInput.row?.length) {
							throw new NodeOperationError(
								this.getNode(),
								'At least one row is required for a reservation',
								{ itemIndex: i },
							);
						}

						// Brightpearl shape for reservation: products object keyed by
						// order-row ID, each value an object with salesOrderRowId and
						// quantity. (Yes, both naming styles are used — Brightpearl's
						// API is inconsistent across endpoints.)
						const products: IDataObject = {};
						for (const r of rowsInput.row) {
							products[String(r.orderRowId)] = {
								salesOrderRowId: r.orderRowId,
								quantity: r.quantity,
							};
						}

						const body: IDataObject = {
							warehouseId,
							products,
						};

						const response = await brightpearlApiRequest.call(
							this,
							'POST',
							`/warehouse-service/order/${orderId}/reservation`,
							body,
						);
						responseData = {
							orderId,
							warehouseId,
							reserved: rowsInput.row,
							response: response?.response ?? null,
						};

					} else if (operation === 'releaseAll') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						await brightpearlApiRequest.call(
							this,
							'DELETE',
							`/warehouse-service/order/${orderId}/reservation`,
						);
						responseData = {
							orderId,
							released: 'all',
						};

					} else if (operation === 'releaseRow') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const orderRowIdToRelease = this.getNodeParameter(
							'orderRowIdToRelease',
							i,
						) as number;
						await brightpearlApiRequest.call(
							this,
							'DELETE',
							`/warehouse-service/order/${orderId}/reservation/${orderRowIdToRelease}`,
						);
						responseData = {
							orderId,
							releasedOrderRowId: orderRowIdToRelease,
						};

					} else {
						throw new NodeOperationError(
							this.getNode(),
							`Unknown reservation operation: ${operation}`,
							{ itemIndex: i },
						);
					}

				// ── OAUTH TOKEN ───────────────────────────────────────────────────────
				} else if (resource === 'oauth') {
					if (operation === 'introspect') {
						// Introspection only makes sense for OAuth2 — private app has
						// no OAuth tokens to inspect.
						const auth = this.getNodeParameter('authentication', 0, 'privateApp') as string;
						if (auth !== 'oauth2') {
							throw new NodeOperationError(
								this.getNode(),
								'Token introspection requires OAuth2 authentication. Switch the Authentication field at the top of the node to OAuth2 and connect a credential of that type.',
								{ itemIndex: i },
							);
						}

						const credentials = await this.getCredentials('brightpearlOAuth2Api');
						const tokenData = credentials.oauthTokenData as IDataObject | undefined;
						if (!tokenData) {
							throw new NodeOperationError(
								this.getNode(),
								'No oauthTokenData stored on the credential — reconnect the credential first and try again.',
								{ itemIndex: i },
							);
						}

						const introspectTokenType = this.getNodeParameter(
							'introspectTokenType',
							i,
							'access_token',
						) as string;
						const includeComputed = this.getNodeParameter(
							'includeComputed',
							i,
							true,
						) as boolean;

						const tokenToInspect =
							introspectTokenType === 'refresh_token'
								? (tokenData.refresh_token as string | undefined)
								: (tokenData.access_token as string | undefined);

						if (!tokenToInspect) {
							throw new NodeOperationError(
								this.getNode(),
								`No ${introspectTokenType} stored on the credential to introspect.`,
								{ itemIndex: i },
							);
						}

						// Brightpearl's RFC 7662 token introspection endpoint:
						//   POST https://{datacenter}/{account}/oauth/token/introspect
						// Per Brightpearl's docs this endpoint differs from standard
						// API endpoints:
						//   1) Body is x-www-form-urlencoded, not JSON
						//   2) Response JSON uses underscore_case keys (not camelCase)
						//   3) Only the `token` form param is required (no
						//      token_type_hint — the endpoint doesn't return info
						//      about refresh tokens at present, so hinting is moot)
						//   4) Auth is HTTP Basic ("client password" mechanism per
						//      RFC 6749 § 2.3.1): client_id as username,
						//      client_secret as password. Secret may be omitted for
						//      public clients.
						//   5) Account code is in the URL path, not under /public-api/.
						const host =
							((tokenData.api_domain as string) ||
								(credentials.datacenter as string));
						const clientId = credentials.clientId as string | undefined;
						const clientSecret = credentials.clientSecret as string | undefined;
						const basicCreds = Buffer.from(
							`${clientId ?? ''}:${clientSecret ?? ''}`,
						).toString('base64');

						// Only `token` goes in the body. Brightpearl's docs explicitly
						// say refresh-token info isn't returned, so skip token_type_hint.
						const formBody = new URLSearchParams({ token: tokenToInspect });

						// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
						const introspectResp = (await this.helpers.httpRequest({
							method: 'POST',
							url: `https://${host}/${credentials.accountCode}/oauth/token/introspect`,
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded',
								Authorization: `Basic ${basicCreds}`,
							},
							body: formBody.toString(),
							json: true,
							returnFullResponse: true,
							ignoreHttpStatusErrors: true,
						})) as { statusCode: number; headers: IDataObject; body: IDataObject };

						if (introspectResp.statusCode >= 400) {
							const bodyStr =
								typeof introspectResp.body === 'object'
									? JSON.stringify(introspectResp.body)
									: String(introspectResp.body);
							throw new NodeOperationError(
								this.getNode(),
								`Brightpearl rejected the introspection request (HTTP ${introspectResp.statusCode}). Response body: ${bodyStr}`,
								{ itemIndex: i },
							);
						}

						// RFC 7662 introspection returns fields at the top level
						// (active, exp, iat, scope, …). No `response:` wrapper here.
						const raw = introspectResp.body as IDataObject;

						responseData = {
							tokenTypeIntrospected: introspectTokenType,
							introspection: raw,
						};

						if (includeComputed) {
							const exp = raw?.exp as number | undefined;
							const iat = raw?.iat as number | undefined;
							const nowSec = Math.floor(Date.now() / 1000);
							const toIso = (sec: number | undefined) =>
								sec ? new Date(sec * 1000).toISOString() : null;
							(responseData as IDataObject).computed = {
								active: raw?.active ?? null,
								secondsUntilExpiry:
									typeof exp === 'number' ? exp - nowSec : null,
								expiryDateTime: toIso(exp),
								issuedDateTime: toIso(iat),
								ageSeconds: typeof iat === 'number' ? nowSec - iat : null,
							};
						}

					} else {
						throw new NodeOperationError(
							this.getNode(),
							`Unknown oauth operation: ${operation}`,
							{ itemIndex: i },
						);
					}

				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, { itemIndex: i });
				}

				// Normalise and push output items
				const outputItems = Array.isArray(responseData) ? responseData : [responseData];

				// Attach `_tokenRefreshed` (+ `_last401Response` when a refresh
				// fired) when the user opted in. We consume (read + clear) the
				// state once per item so the same values get stamped onto every
				// output item produced by this iteration (e.g. all pages of a
				// Get Many fan out from a single input item).
				if (includeRefreshMetadata) {
					const state = consumeTokenRefreshFlag(this);
					outputItems.forEach((item) => {
						(item as IDataObject)._tokenRefreshed = state.refreshed;
						if (state.refreshed && state.last401Response) {
							(item as IDataObject)._last401Response =
								state.last401Response as unknown as IDataObject;
						}
					});
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(outputItems as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);

			} catch (error) {
				// brightpearlApiRequest sets httpCode on every NodeApiError it throws
				// (the real Brightpearl response code where there is one, or a
				// remapped 429 for Brightpearl's nonstandard OAuth-throttle 400) so a
				// downstream resilience workflow can branch on the actual HTTP status
				// instead of parsing message text.
				const errAsMessage = error as { message?: string; description?: string; httpCode?: string };

				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: errAsMessage.message ?? (error as Error).message,
							httpCode: errAsMessage.httpCode,
							description: errAsMessage.description,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				// error is very often ALREADY a NodeApiError/NodeOperationError thrown
				// by brightpearlApiRequest with a specific, carefully-built message
				// (e.g. distinguishing an OAuth refresh failure from a post-refresh
				// API error). NodeApiError's constructor expects a raw HTTP error/
				// response shape as its second argument — feeding it an existing
				// NodeApiError instance doesn't match that shape, so it falls back to
				// n8n's generic per-status-code message ("Authorization failed -
				// please check your credentials") and the real message is lost.
				// Explicitly forcing message/description/httpCode through `options`
				// survives that regardless of how the constructor parses the
				// JsonObject blob.
				throw new NodeApiError(this.getNode(), error as unknown as JsonObject, {
					itemIndex: i,
					message: errAsMessage.message,
					description: errAsMessage.description,
					httpCode: errAsMessage.httpCode,
				});
			}
		}

		return [returnData];
	}
}
