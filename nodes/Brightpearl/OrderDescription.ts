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
				name: 'Get Custom Fields',
				value: 'getCustomFields',
				description: 'Get all custom fields set on a sales order',
				action: 'Get sales order custom fields',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Search and retrieve multiple sales orders',
				action: 'Get many sales orders',
			},
			{
				name: 'Update Custom Fields',
				value: 'updateCustomFields',
				description: 'Update one or more custom fields on a sales order',
				action: 'Update sales order custom fields',
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
	// ─── GET / UPDATE STATUS / GET CUSTOM FIELDS / UPDATE CUSTOM FIELDS ──────
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['order'],
				operation: ['get', 'updateStatus', 'getCustomFields', 'updateCustomFields'],
			},
		},
		description: 'The Brightpearl sales order ID',
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['order'], operation: ['get'] } },
		description:
			'Whether to return a flattened version of the order: statusId+statusName at the top level, customer/billing/delivery with nested address, rows as an array, totals with simple field names. Turn off to get the raw Brightpearl response.',
	},

	// ─── UPDATE CUSTOM FIELDS ────────────────────────────────────────────────
	{
		displayName: 'Custom Fields',
		name: 'customFields',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Custom Field',
		default: { field: [] },
		displayOptions: {
			show: { resource: ['order'], operation: ['updateCustomFields'] },
		},
		description:
			'Each entry becomes a JSON Patch "replace" op on the order custom field. Use the field code (e.g. PCF_FOO) and the new value. Set value to empty and check Remove to clear the field.',
		options: [
			{
				name: 'field',
				displayName: 'Field',
				values: [
					{
						displayName: 'Field Code',
						name: 'code',
						type: 'string',
						required: true,
						default: '',
						description: 'The custom field code (e.g. PCF_DELIVERY_NOTES)',
					},
					{
						displayName: 'Remove',
						name: 'remove',
						type: 'boolean',
						default: false,
						description: 'Whether to remove this custom field instead of setting its value',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'The new value for the custom field (ignored when Remove is true)',
					},
				],
			},
		],
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
				displayName: 'Created By ID',
				name: 'createdById',
				type: 'number',
				default: 0,
				description: 'Filter by the staff ID that created the order',
			},
			{
				displayName: 'Created On (From)',
				name: 'createdOnFrom',
				type: 'dateTime',
				default: '',
				description: 'Return orders created on or after this date/time',
			},
			{
				displayName: 'Created On (To)',
				name: 'createdOnTo',
				type: 'dateTime',
				default: '',
				description: 'Return orders created on or before this date/time',
			},
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'number',
				default: 0,
				description: 'Filter by customer contact ID',
			},
			{
				displayName: 'Customer Reference',
				name: 'customerRef',
				type: 'string',
				default: '',
				description:
					'Filter by the customer reference on the order (PO number, web ref, etc.). This is the column shown as "Customer Ref" in Brightpearl.',
			},
			{
				displayName: 'Delivery Date (From)',
				name: 'deliveryDateFrom',
				type: 'dateTime',
				default: '',
				description: 'Return orders with a delivery date on or after this date',
			},
			{
				displayName: 'Delivery Date (To)',
				name: 'deliveryDateTo',
				type: 'dateTime',
				default: '',
				description: 'Return orders with a delivery date on or before this date',
			},
			{
				displayName: 'External Reference',
				name: 'externalRef',
				type: 'string',
				default: '',
				description: 'Filter by externalRef (e.g. marketplace order ID)',
			},
			{
				displayName: 'Order Payment Status',
				name: 'orderPaymentStatus',
				type: 'string',
				default: '',
				description: 'Brightpearl payment status code (e.g. PAID, UNPAID, PARTIAL)',
			},
			{
				displayName: 'Order Shipping Status',
				name: 'orderShippingStatus',
				type: 'string',
				default: '',
				description: 'Brightpearl shipping status code (e.g. SHIPPED, PARTSHIPPED, UNSHIPPED)',
			},
			{
				displayName: 'Order Status ID',
				name: 'orderStatusId',
				type: 'number',
				default: 0,
				description: 'Filter by Brightpearl order status ID',
			},
			{
				displayName: 'Order Stock Status',
				name: 'orderStockStatus',
				type: 'string',
				default: '',
				description: 'Brightpearl stock status code (e.g. AVL, NST, PARTIAL)',
			},
			{
				displayName: 'Sales Order ID',
				name: 'salesOrderId',
				type: 'string',
				default: '',
				description:
					'Filter by sales order ID. Supports single, range (1000-1100), or comma-separated (1000,1005,1010).',
			},
			{
				displayName: 'Staff Owner ID',
				name: 'staffOwnerId',
				type: 'number',
				default: 0,
				description: 'Filter by assigned staff owner ID',
			},
			{
				displayName: 'Tax Date (From)',
				name: 'taxDateFrom',
				type: 'dateTime',
				default: '',
				description: 'Return orders with a tax date on or after this date',
			},
			{
				displayName: 'Tax Date (To)',
				name: 'taxDateTo',
				type: 'dateTime',
				default: '',
				description: 'Return orders with a tax date on or before this date',
			},
			{
				displayName: 'Updated On (From)',
				name: 'updatedOnFrom',
				type: 'dateTime',
				default: '',
				description: 'Return orders last updated on or after this date/time',
			},
			{
				displayName: 'Updated On (To)',
				name: 'updatedOnTo',
				type: 'dateTime',
				default: '',
				description: 'Return orders last updated on or before this date/time',
			},
			{
				displayName: 'Warehouse ID',
				name: 'warehouseId',
				type: 'number',
				default: 0,
				description: 'Filter by warehouse ID',
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
						description: 'E.g. T20 for 20% VAT.',
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
