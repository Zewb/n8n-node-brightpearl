import { INodeProperties } from 'n8n-workflow';

export const productOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['product'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new product',
				action: 'Create a product',
			},
			{
				name: 'Custom API Call',
				value: 'customApiCall',
				description:
					'See the notice below — use the HTTP Request node for endpoints not yet wired up here',
				action: 'Custom API call',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single product by ID',
				action: 'Get a product',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Search and retrieve multiple products',
				action: 'Get many products',
			},
		],
		default: 'get',
	},
];

export const productFields: INodeProperties[] = [
	// ─── GET ──────────────────────────────────────────────────────────────────
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['product'], operation: ['get'] } },
		description: 'The Brightpearl product ID',
	},

	// ─── GET MANY ─────────────────────────────────────────────────────────────
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['product'], operation: ['getMany'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: {
			show: { resource: ['product'], operation: ['getMany'], returnAll: [false] },
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['product'], operation: ['getMany'] } },
		options: [
			{
				displayName: 'Brand ID',
				name: 'brandId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Category ID',
				name: 'categoryId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Is Active',
				name: 'isActive',
				type: 'boolean',
				default: true,
				description: 'Whether to include only active or only inactive products',
			},
			{
				displayName: 'Product Name',
				name: 'productName',
				type: 'string',
				default: '',
				description: 'Filter by product name (partial match)',
			},
			{
				displayName: 'SKU',
				name: 'sku',
				type: 'string',
				default: '',
				description: 'Filter by exact SKU',
			},
		],
	},
	{
		displayName: 'Batching',
		name: 'batching',
		type: 'collection',
		placeholder: 'Add Batching Option',
		default: {},
		displayOptions: {
			show: { resource: ['product'], operation: ['getMany'], returnAll: [true] },
		},
		description:
			'Optional: pace the page-by-page fetch so large queries do not exhaust the Brightpearl quota and trip the rate-limit retry loop.',
		options: [
			{
				displayName: 'Delay Between Pages (Ms)',
				name: 'pageDelayMs',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				description:
					'How long to wait between consecutive page requests. Try 500–1000 if you are hitting 503 errors on large fetches.',
			},
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 200,
				typeOptions: { minValue: 1, maxValue: 200 },
				description:
					'How many results per Brightpearl page request. Lower values use more API calls but each call is cheaper against the quota.',
			},
		],
	},

	// ─── CREATE ───────────────────────────────────────────────────────────────
	{
		displayName: 'Product Name',
		name: 'productName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['product'], operation: ['create'] } },
		description: 'The product name as shown in the Brightpearl channel',
	},
	{
		displayName: 'Additional Fields',
		name: 'productAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['product'], operation: ['create'] } },
		options: [
			{
				displayName: 'Barcode',
				name: 'barcode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Brand ID',
				name: 'brandId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'string',
				default: '',
				description: 'Category code for the Brightpearl sales channel',
			},
			{
				displayName: 'EAN',
				name: 'ean',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Short Description',
				name: 'shortDescription',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'SKU',
				name: 'sku',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Code ID',
				name: 'taxCodeId',
				type: 'number',
				default: 0,
				description: 'Financial tax code ID for this product',
			},
			{
				displayName: 'Track Stock',
				name: 'stockTracked',
				type: 'boolean',
				default: true,
			},
		],
	},
];
