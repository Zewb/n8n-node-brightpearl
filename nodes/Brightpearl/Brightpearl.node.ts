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
	searchResultsToObjects,
	simplifyOrder,
} from './GenericFunctions';

import { orderOperations, orderFields } from './OrderDescription';
import { productOperations, productFields } from './ProductDescription';
import { priceListOperations, priceListFields } from './PriceListDescription';

export class Brightpearl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Brightpearl',
		name: 'brightpearl',
		icon: 'file:brightpearl.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with orders, products, and price lists in Brightpearl',
		defaults: { name: 'Brightpearl' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'brightpearlApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Order', value: 'order' },
					{ name: 'Price List', value: 'priceList' },
					{ name: 'Product', value: 'product' },
				],
				default: 'order',
			},
			...orderOperations,
			...orderFields,
			...productOperations,
			...productFields,
			...priceListOperations,
			...priceListFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
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

						if (returnAll) {
							responseData = await brightpearlApiRequestAllItems.call(
								this,
								'GET',
								'/order-service/sales-order-search',
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							const response = await brightpearlApiRequest.call(
								this,
								'GET',
								'/order-service/sales-order-search',
								undefined,
								{ ...qs, firstResult: 1, pageSize: limit },
							);
							responseData = searchResultsToObjects(response);
						}

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

					} else if (operation === 'getCustomFields') {
						const orderId = this.getNodeParameter('orderId', i) as string;
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							`/order-service/order/${orderId}/custom-field`,
						);
						// Brightpearl returns { response: { customFieldCode: value, ... } } —
						// surface it as a flat object so downstream nodes can map fields directly.
						const fields = (response?.response as IDataObject) ?? {};
						responseData = { orderId, ...fields };

					} else if (operation === 'updateCustomFields') {
						const orderId = this.getNodeParameter('orderId', i) as string;
						const cfInput = this.getNodeParameter('customFields', i) as {
							field: Array<{ code: string; value?: string; remove?: boolean }>;
						};

						if (!cfInput.field?.length) {
							throw new NodeOperationError(
								this.getNode(),
								'At least one custom field must be provided',
								{ itemIndex: i },
							);
						}

						const patchOps = cfInput.field.map((f) =>
							f.remove
								? { op: 'remove', path: `/${f.code}` }
								: { op: 'replace', path: `/${f.code}`, value: f.value ?? '' },
						);

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
						if (filters.productName) qs.productName = filters.productName;
						if (filters.sku) qs.SKU = filters.sku;
						if (filters.brandId) qs.brandId = filters.brandId;
						if (filters.categoryId) qs.categoryId = filters.categoryId;
						if (filters.isActive !== undefined) qs.isActive = filters.isActive;

						if (returnAll) {
							responseData = await brightpearlApiRequestAllItems.call(
								this,
								'GET',
								'/product-service/product-search',
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							const response = await brightpearlApiRequest.call(
								this,
								'GET',
								'/product-service/product-search',
								undefined,
								{ ...qs, firstResult: 1, pageSize: limit },
							);
							responseData = searchResultsToObjects(response);
						}

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

				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, { itemIndex: i });
				}

				// Normalise and push output items
				const outputItems = Array.isArray(responseData) ? responseData : [responseData];
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(outputItems as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
