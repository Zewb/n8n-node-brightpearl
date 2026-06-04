import { INodeProperties } from 'n8n-workflow';

export const priceListOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['priceList'] } },
		options: [
			{
				name: 'Custom API Call',
				value: 'customApiCall',
				description:
					'See the notice below — use the HTTP Request node for endpoints not yet wired up here',
				action: 'Custom API call',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many price lists on the account',
				action: 'Get many price lists',
			},
			{
				name: 'Get Product Prices',
				value: 'getPrices',
				description: 'Get prices for a product across one or all price lists',
				action: 'Get product prices',
			},
			{
				name: 'Set Product Price',
				value: 'setPrice',
				description: 'Set or update a product price on a price list',
				action: 'Set a product price',
			},
		],
		default: 'getAll',
	},
];

export const priceListFields: INodeProperties[] = [
	// ─── GET PRODUCT PRICES ───────────────────────────────────────────────────
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['priceList'], operation: ['getPrices', 'setPrice'] } },
		description: 'The Brightpearl product ID',
	},
	{
		displayName: 'Price List ID',
		name: 'priceListId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['priceList'], operation: ['getPrices', 'setPrice'] } },
		description: 'The Brightpearl price list ID',
	},

	// ─── SET PRODUCT PRICE ────────────────────────────────────────────────────
	{
		displayName: 'Base Price (Qty 1)',
		name: 'basePrice',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { numberPrecision: 4 },
		displayOptions: { show: { resource: ['priceList'], operation: ['setPrice'] } },
		description: 'Net price for a single unit',
	},
	{
		displayName: 'SKU',
		name: 'sku',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['priceList'], operation: ['setPrice'] } },
		description: 'SKU override to associate with this price list entry (leave blank to use the product SKU)',
	},
	{
		displayName: 'Quantity Price Breaks',
		name: 'quantityPriceBreaks',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Price Break',
		default: { break: [] },
		displayOptions: { show: { resource: ['priceList'], operation: ['setPrice'] } },
		description: 'Optional tiered pricing by minimum quantity',
		options: [
			{
				name: 'break',
				displayName: 'Break',
				values: [
					{
						displayName: 'Min Quantity',
						name: 'minQuantity',
						type: 'number',
						required: true,
						default: 2,
						description: 'Minimum quantity threshold for this price',
					},
					{
						displayName: 'Price',
						name: 'price',
						type: 'number',
						required: true,
						default: 0,
						typeOptions: { numberPrecision: 4 },
					},
				],
			},
		],
	},
];
