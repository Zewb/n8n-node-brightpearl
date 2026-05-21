import { INodeProperties } from 'n8n-workflow';

export const orderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['order'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new sales order',
				action: 'Create a sales order',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single sales order by ID',
				action: 'Get a sales order',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Search and retrieve multiple sales orders',
				action: 'Get many sales orders',
			},
			{
				name: 'Update Status',
				value: 'updateStatus',
				description: 'Update the status of an existing sales order',
				action: 'Update sales order status',
			},
		],
		default: 'get',
	},
];

export const orderFields: INodeProperties[] = [
	// ─── GET ──────────────────────────────────────────────────────────────────
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['order'], operation: ['get', 'updateStatus'] } },
		description: 'The Brightpearl sales order ID',
	},

	// ─── GET MANY ─────────────────────────────────────────────────────────────
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['order'], operation: ['getMany'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: {
			show: { resource: ['order'], operation: ['getMany'], returnAll: [false] },
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['order'], operation: ['getMany'] } },
		options: [
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'number',
				default: 0,
				description: 'Filter by sales channel ID',
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				default: 0,
				description: 'Filter by customer contact ID',
			},
			{
				displayName: 'Created On (From)',
				name: 'createdOnFrom',
				type: 'dateTime',
				default: '',
				description: 'Return orders placed on or after this date/time',
			},
			{
				displayName: 'Created On (To)',
				name: 'createdOnTo',
				type: 'dateTime',
				default: '',
				description: 'Return orders placed on or before this date/time',
			},
			{
				displayName: 'Order Reference',
				name: 'orderReference',
				type: 'string',
				default: '',
				description: 'Filter by the order reference field',
			},
			{
				displayName: 'Order Status ID',
				name: 'orderStatusId',
				type: 'number',
				default: 0,
				description: 'Filter by Brightpearl order status ID',
			},
		],
	},

	// ─── CREATE ───────────────────────────────────────────────────────────────
	{
		displayName: 'Customer ID',
		name: 'contactId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['order'], operation: ['create'] } },
		description: 'Brightpearl contact ID of the customer placing the order',
	},
	{
		displayName: 'Additional Fields',
		name: 'orderAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['order'], operation: ['create'] } },
		options: [
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Currency Code',
				name: 'currencyCode',
				type: 'string',
				default: 'GBP',
				description: 'ISO 4217 currency code',
			},
			{
				displayName: 'Order Reference',
				name: 'ref',
				type: 'string',
				default: '',
				description: 'Your own reference for this order',
			},
			{
				displayName: 'Placed On',
				name: 'placedOn',
				type: 'dateTime',
				default: '',
				description: 'Date and time the order was placed',
			},
			{
				displayName: 'Price List ID',
				name: 'priceListId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Status ID',
				name: 'statusId',
				type: 'number',
				default: 0,
				description: 'Initial order status ID',
			},
			{
				displayName: 'Warehouse ID',
				name: 'warehouseId',
				type: 'number',
				default: 0,
			},
		],
	},
	{
		displayName: 'Order Rows',
		name: 'orderRows',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Row',
		default: { row: [] },
		displayOptions: { show: { resource: ['order'], operation: ['create'] } },
		options: [
			{
				name: 'row',
				displayName: 'Row',
				values: [
					{
						displayName: 'Net Price',
						name: 'net',
						type: 'number',
						default: 0,
						description: 'Net (ex-tax) price per unit',
					},
					{
						displayName: 'Product ID',
						name: 'productId',
						type: 'number',
						required: true,
						default: 0,
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						required: true,
						default: 1,
					},
					{
						displayName: 'Tax Amount',
						name: 'tax',
						type: 'number',
						default: 0,
						description: 'Tax amount for this row',
					},
					{
						displayName: 'Tax Code',
						name: 'taxCode',
						type: 'string',
						default: '',
						description: 'E.g. T20 for 20% VAT',
					},
				],
			},
		],
	},

	// ─── UPDATE STATUS ────────────────────────────────────────────────────────
	{
		displayName: 'New Status ID',
		name: 'newStatusId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['order'], operation: ['updateStatus'] } },
		description: 'The Brightpearl order status ID to set',
	},
	{
		displayName: 'Status Update Options',
		name: 'statusUpdateOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['order'], operation: ['updateStatus'] } },
		options: [
			{
				displayName: 'Note Text',
				name: 'noteText',
				type: 'string',
				default: '',
				description: 'Optional note to attach to the status change',
			},
			{
				displayName: 'Note Is Public',
				name: 'noteIsPublic',
				type: 'boolean',
				default: false,
				description: 'Whether the note is visible to the customer',
			},
		],
	},
];
