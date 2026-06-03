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
				name: 'Add Note',
				value: 'addNote',
				description: 'Add a note to an existing sales order',
				action: 'Add a note to a sales order',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new sales order',
				action: 'Create a sales order',
			},
			{
				name: 'Get',
				value: 'get',
				description:
					'Get a sales order via /sales-order/{ID}. Rich response with orderStatus.name available; flattened by default via the Simplify toggle.',
				action: 'Get a sales order',
			},
			{
				name: 'Get (Order Endpoint)',
				value: 'getViaOrder',
				description:
					'Get an order via the generic /order/{ID} endpoint. Returns the same rich data as Get (including status name) and supports the Simplify toggle. Useful when you want the order-service view or are working across order types.',
				action: 'Get an order via order endpoint',
			},
			{
				name: 'Get Custom Field Metadata',
				value: 'getCustomFieldMeta',
				description:
					'List all custom field definitions for orders: codes, names, types, and (for SELECT/list fields) the available option IDs and labels. Run this to discover what to send in Update Custom Fields.',
				action: 'Get order custom field metadata',
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
				name: 'Search Orders (Order Endpoint)',
				value: 'searchOrders',
				description:
					'Search orders via /order-service/order-search. Different column set than Get Many: integer status IDs with reference-data labels, plus orderTypeId, parentOrderId, departmentId.',
				action: 'Search orders via the order endpoint',
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
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['order'],
				operation: [
					'get',
					'getViaOrder',
					'updateStatus',
					'getCustomFields',
					'updateCustomFields',
					'addNote',
				],
			},
		},
		description:
			'The Brightpearl order ID. For the two Get operations you can also pass an ID set: a single ID (2545638), an ascending range (2545638-2545640), or a comma-separated list (2545638,2546211,2560258). Each returned order becomes a separate output item. Update and Add Note operations expect a single ID.',
	},

	// ─── ADD NOTE ────────────────────────────────────────────────────────────
	{
		displayName: 'Note Text',
		name: 'noteText',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		displayOptions: { show: { resource: ['order'], operation: ['addNote'] } },
		description: 'The body of the note to add to the order',
	},
	{
		displayName: 'Additional Fields',
		name: 'addNoteAdditional',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['order'], operation: ['addNote'] } },
		options: [
			{
				displayName: 'Added On',
				name: 'addedOn',
				type: 'dateTime',
				default: '',
				description:
					'When the note was added. Defaults to the current server time when omitted.',
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				default: 0,
				description:
					'Contact ID to associate with the note. Defaults to the authenticated user when omitted.',
			},
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'number',
				default: 0,
				description: 'ID of a previously-uploaded Brightpearl file to attach to the note',
			},
			{
				displayName: 'Is Public',
				name: 'isPublic',
				type: 'boolean',
				default: false,
				description: 'Whether the note is visible on the customer portal',
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['order'], operation: ['get', 'getViaOrder'] } },
		description:
			'Whether to return a flattened version of each order: statusId+statusName at the top level, customer/billing/delivery with nested address, rows as an array, totals with simple field names. Turn off to get the raw Brightpearl response.',
	},

	// ─── GET CUSTOM FIELD METADATA ──────────────────────────────────────────
	{
		displayName: 'Order Type',
		name: 'metaOrderType',
		type: 'options',
		default: 'sale',
		displayOptions: { show: { resource: ['order'], operation: ['getCustomFieldMeta'] } },
		options: [
			{ name: 'Sale', value: 'sale' },
			{ name: 'Purchase', value: 'purchase' },
		],
		description: 'Which order type to fetch custom field definitions for',
	},

	// ─── UPDATE CUSTOM FIELDS ────────────────────────────────────────────────
	{
		displayName: 'Input Mode',
		name: 'customFieldInputMode',
		type: 'options',
		default: 'fields',
		displayOptions: { show: { resource: ['order'], operation: ['updateCustomFields'] } },
		options: [
			{
				name: 'Builder',
				value: 'fields',
				description: 'Build the JSON Patch from individual fields (operation, code, value, type)',
			},
			{
				name: 'Raw JSON Patch',
				value: 'raw',
				description: 'Provide the complete RFC 6902 JSON Patch array yourself',
			},
		],
		description: 'How to specify the custom field changes',
	},
	{
		displayName: 'Custom Fields',
		name: 'customFields',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Custom Field',
		default: { field: [] },
		displayOptions: {
			show: {
				resource: ['order'],
				operation: ['updateCustomFields'],
				customFieldInputMode: ['fields'],
			},
		},
		description: 'Each entry becomes one JSON Patch operation against the order custom fields',
		options: [
			{
				name: 'field',
				displayName: 'Field',
				values: [
					{
						displayName: 'Operation',
						name: 'op',
						type: 'options',
						default: 'add',
						description:
							'JSON Patch operation. Add creates-or-overwrites (use for currently-empty fields); Replace only works when the field already has a value; Remove deletes a value that exists.',
						options: [
							{ name: 'Add / Set', value: 'add' },
							{ name: 'Replace', value: 'replace' },
							{ name: 'Remove', value: 'remove' },
						],
					},
					{
						displayName: 'Field Code',
						name: 'code',
						type: 'string',
						required: true,
						default: '',
						description: 'The custom field code, used as the patch path (e.g. PCF_DELIVERY_NOTES)',
					},
					{
						displayName: 'Value Type',
						name: 'valueType',
						type: 'options',
						default: 'text',
						description:
							'The Brightpearl type of this custom field. Must match, or Brightpearl returns a 500. Text covers TEXT/TEXTAREA and DATE (send dates as "yyyy-MM-dd"); Boolean for YES_NO; Number for INTEGER; List/Select for SELECT fields (enter the option ID — use Get Custom Field Metadata to find it). Ignored for Remove.',
						options: [
							{ name: 'Text / Date', value: 'text' },
							{ name: 'Number', value: 'number' },
							{ name: 'Boolean (Yes/No)', value: 'boolean' },
							{ name: 'List / Select (Option ID)', value: 'select' },
						],
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description:
							'The new value (ignored for Remove). For Boolean use true/false; for Number enter digits; for Date use yyyy-MM-dd; for List/Select enter the numeric option ID.',
					},
				],
			},
		],
	},
	{
		displayName: 'JSON Patch',
		name: 'customFieldRawPatch',
		type: 'string',
		typeOptions: { rows: 10 },
		default:
			'[\n  {\n    "op": "add",\n    "path": "/PCF_EXAMPLE",\n    "value": "your value"\n  }\n]',
		displayOptions: {
			show: {
				resource: ['order'],
				operation: ['updateCustomFields'],
				customFieldInputMode: ['raw'],
			},
		},
		description:
			'A raw RFC 6902 JSON Patch array sent to the order custom-field endpoint. Toggle expression mode on the field to use expressions. Each op needs op (add / replace / remove), path ("/FIELD_CODE"), and value. The value MUST match the field type: strings stay inside quotes; booleans and numbers go UNQUOTED so they become JSON true/false/123 not string "true"; SELECT fields take an object containing the numeric option ID. A type mismatch makes Brightpearl return a 500. The Builder mode handles all coercion automatically — use Raw only when you need RFC 6902 control (mixing ops, etc).',
	},

	// ─── GET MANY / SEARCH ORDERS — shared paging fields ─────────────────────
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: { resource: ['order'], operation: ['getMany', 'searchOrders'] },
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: {
			show: {
				resource: ['order'],
				operation: ['getMany', 'searchOrders'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'First Result',
		name: 'firstResult',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: {
			show: {
				resource: ['order'],
				operation: ['getMany', 'searchOrders'],
				returnAll: [false],
			},
		},
		description:
			'1-indexed starting position. Combine with Limit to paginate: e.g. First Result=1 + Limit=50 gives page 1; First Result=51 gives page 2. Use the _pagination metadata on returned items to see how many total results exist.',
	},
	{
		displayName: 'Columns to Return',
		name: 'columns',
		type: 'multiOptions',
		default: [],
		displayOptions: { show: { resource: ['order'], operation: ['getMany'] } },
		description:
			'Pick which sales-order-search columns to return. Leave empty for the Brightpearl defaults. Restricting the set is faster and produces smaller results.',
		options: [
			{ name: 'Channel ID', value: 'channelId' },
			{ name: 'Created By ID', value: 'createdById' },
			{ name: 'Created On', value: 'createdOn' },
			{ name: 'Customer ID', value: 'customerId' },
			{ name: 'Customer Ref', value: 'customerRef' },
			{ name: 'Delivery Date', value: 'deliveryDate' },
			{ name: 'External Ref', value: 'externalRef' },
			{
				name: 'Installed Integration Instance ID',
				value: 'installedIntegrationInstanceId',
			},
			{ name: 'Order Payment Status', value: 'orderPaymentStatus' },
			{ name: 'Order Shipping Status', value: 'orderShippingStatus' },
			{ name: 'Order Status ID', value: 'orderStatusId' },
			{ name: 'Order Stock Status', value: 'orderStockStatus' },
			{ name: 'Sales Order ID', value: 'salesOrderId' },
			{ name: 'Staff Owner ID', value: 'staffOwnerId' },
			{ name: 'Tax Date', value: 'taxDate' },
			{ name: 'Updated On', value: 'updatedOn' },
			{ name: 'Warehouse ID', value: 'warehouseId' },
		],
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
				type: 'string',
				default: '',
				description:
					'Filter by warehouse ID. ID set syntax supported: single (1), range (3-4), or comma list (1,3-4,7).',
			},
		],
	},

	// ─── SEARCH ORDERS (/order-service/order-search) ──────────────────────────
	{
		displayName: 'Columns to Return',
		name: 'searchOrdersColumns',
		type: 'multiOptions',
		default: [],
		displayOptions: { show: { resource: ['order'], operation: ['searchOrders'] } },
		description:
			'Pick which order-search columns to return. Leave empty for the Brightpearl defaults.',
		options: [
			{ name: 'Contact ID', value: 'contactId' },
			{ name: 'Created By ID', value: 'createdById' },
			{ name: 'Created On', value: 'createdOn' },
			{ name: 'Customer Ref', value: 'customerRef' },
			{ name: 'Delivery Date', value: 'deliveryDate' },
			{ name: 'Department ID', value: 'departmentId' },
			{ name: 'External Ref', value: 'externalRef' },
			{
				name: 'Installed Integration Instance ID',
				value: 'installedIntegrationInstanceId',
			},
			{ name: 'Order ID', value: 'orderId' },
			{ name: 'Order Payment Status ID', value: 'orderPaymentStatusId' },
			{ name: 'Order Shipping Status ID', value: 'orderShippingStatusId' },
			{ name: 'Order Status ID', value: 'orderStatusId' },
			{ name: 'Order Stock Status ID', value: 'orderStockStatusId' },
			{ name: 'Order Type ID', value: 'orderTypeId' },
			{ name: 'Parent Order ID', value: 'parentOrderId' },
			{ name: 'Staff Owner Contact ID', value: 'staffOwnerContactId' },
			{ name: 'Tax Date', value: 'taxDate' },
			{ name: 'Updated On', value: 'updatedOn' },
			{ name: 'Warehouse ID', value: 'warehouseId' },
		],
	},
	{
		displayName: 'Filters',
		name: 'searchOrdersFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['order'], operation: ['searchOrders'] } },
		options: [
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				default: 0,
				description: 'Filter by contact (customer or supplier) ID',
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
				displayName: 'Customer Reference',
				name: 'customerRef',
				type: 'string',
				default: '',
				description: 'Filter by the customer reference on the order',
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
				displayName: 'Department ID',
				name: 'departmentId',
				type: 'number',
				default: 0,
				description: 'Filter by department ID',
			},
			{
				displayName: 'External Reference',
				name: 'externalRef',
				type: 'string',
				default: '',
				description: 'Filter by externalRef (e.g. marketplace order ID)',
			},
			{
				displayName: 'Order ID',
				name: 'orderId',
				type: 'string',
				default: '',
				description:
					'Filter by order ID. Supports single, range (1000-1100), or comma-separated (1000,1005).',
			},
			{
				displayName: 'Order Payment Status ID',
				name: 'orderPaymentStatusId',
				type: 'number',
				default: 0,
				description: 'Filter by payment status ID (resolves to a label via reference data)',
			},
			{
				displayName: 'Order Shipping Status ID',
				name: 'orderShippingStatusId',
				type: 'number',
				default: 0,
				description: 'Filter by shipping status ID (resolves to a label via reference data)',
			},
			{
				displayName: 'Order Status ID',
				name: 'orderStatusId',
				type: 'number',
				default: 0,
				description: 'Filter by Brightpearl order status ID',
			},
			{
				displayName: 'Order Stock Status ID',
				name: 'orderStockStatusId',
				type: 'number',
				default: 0,
				description: 'Filter by stock status ID (resolves to a label via reference data)',
			},
			{
				displayName: 'Order Type ID',
				name: 'orderTypeId',
				type: 'string',
				default: '',
				description:
					'Filter by order type ID. ID set syntax supported (e.g. 1 for sales orders, 2 for purchase orders, or 1,2 for both).',
			},
			{
				displayName: 'Parent Order ID',
				name: 'parentOrderId',
				type: 'string',
				default: '',
				description: 'Filter to child orders of a given parent. ID set syntax supported.',
			},
			{
				displayName: 'Staff Owner Contact ID',
				name: 'staffOwnerContactId',
				type: 'number',
				default: 0,
				description: 'Filter by assigned staff owner contact ID',
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
				type: 'string',
				default: '',
				description: 'Filter by warehouse ID. ID set syntax supported.',
			},
		],
	},

	// ─── BATCHING (advanced / optional, applies to Return All on both searches) ──
	{
		displayName: 'Batching',
		name: 'batching',
		type: 'collection',
		placeholder: 'Add Batching Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['order'],
				operation: ['getMany', 'searchOrders'],
				returnAll: [true],
			},
		},
		description:
			'Optional: pace the page-by-page fetch so large queries do not exhaust the Brightpearl quota and trip the rate-limit retry loop. The in-node 503/429 handler already backs off when Brightpearl asks, but proactive pacing avoids hitting the wall in the first place.',
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
