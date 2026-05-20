import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

import {
	brightpearlApiRequest,
	brightpearlApiRequestAllItems,
	searchResultsToObjects,
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
		inputs: ['main'],
		outputs: ['main'],
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
					if (operation === 'get') {
						const orderId = this.getNodeParameter('orderId', i) as number;
						const response = await brightpearlApiRequest.call(
							this,
							'GET',
							`/order-service/sales-order/${orderId}`,
						);
						responseData = (response?.response as IDataObject) ?? response;

					} else if (operation === 'getMany') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						const qs: IDataObject = { orderTypeId: 1 };
						if (filters.orderStatusId) qs.orderStatusId = filters.orderStatusId;
						if (filters.contactId) qs.contactId = filters.contactId;
						if (filters.channelId) qs.channelId = filters.channelId;
						if (filters.orderReference) qs.orderReference = filters.orderReference;
						if (filters.createdOnFrom) qs.createdOnFrom = filters.createdOnFrom;
						if (filters.createdOnTo) qs.createdOnTo = filters.createdOnTo;

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
						const orderId = this.getNodeParameter('orderId', i) as number;
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

					} else {
						throw new Error(`Unknown order operation: ${operation}`);
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
						throw new Error(`Unknown product operation: ${operation}`);
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
						throw new Error(`Unknown priceList operation: ${operation}`);
					}

				} else {
					throw new Error(`Unknown resource: ${resource}`);
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
				throw error;
			}
		}

		return [returnData];
	}
}
