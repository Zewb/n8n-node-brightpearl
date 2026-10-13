import { INodeProperties } from 'n8n-workflow';

export const goodsInNoteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['goodsInNote'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description:
					'Create a goods in note (receiving against a purchase order) via POST /warehouse-service/order/{orderId}/goods-note/goods-in',
				action: 'Create a goods in note',
			},
			{
				name: 'Custom API Call',
				value: 'customApiCall',
				description:
					'See the notice below — use the HTTP Request node for endpoints not yet wired up here',
				action: 'Custom API call',
			},
			{
				name: 'Delete',
				value: 'delete',
				description:
					'Delete a goods in note via DELETE /warehouse-service/order/{orderId}/goods-note/goods-in/{noteID}',
				action: 'Delete a goods in note',
			},
			{
				name: 'Get',
				value: 'get',
				description:
					'Get one or more goods in notes via GET /warehouse-service/order/{orderId}/goods-note/goods-in/{idSet}',
				action: 'Get a goods in note',
			},
			{
				name: 'Search',
				value: 'search',
				description:
					'Search goods in notes via /warehouse-service/goods-in-search (column-based filters)',
				action: 'Search goods in notes',
			},
		],
		default: 'create',
	},
];

export const goodsInNoteFields: INodeProperties[] = [
	// ─── Shared Order ID ─────────────────────────────────────────────────────
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['goodsInNote'],
				operation: ['create', 'get', 'delete'],
			},
		},
		description: 'The Brightpearl purchase order ID the goods-in note belongs to',
	},

	// ─── GET: Goods-In Note ID set ───────────────────────────────────────────
	{
		displayName: 'Goods-In Note ID',
		name: 'goodsInNoteId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: { resource: ['goodsInNote'], operation: ['get'] },
		},
		description:
			'The goods-in note ID. ID set syntax supported: single (123), ascending range (100-199), or comma-separated list (1,2,3).',
	},

	// ─── DELETE: single Goods-In Note ID ─────────────────────────────────────
	{
		displayName: 'Goods-In Note ID',
		name: 'goodsInNoteIdSingle',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['goodsInNote'], operation: ['delete'] },
		},
		description: 'The ID of the goods-in note to delete',
	},

	// ─── CREATE ───────────────────────────────────────────────────────────────
	{
		displayName: 'Warehouse ID',
		name: 'warehouseId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['goodsInNote'], operation: ['create'] },
		},
		description: 'Warehouse into which the goods are being received',
	},
	{
		displayName: 'Rows',
		name: 'goodsInRows',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Row',
		required: true,
		default: { row: [] },
		displayOptions: {
			show: { resource: ['goodsInNote'], operation: ['create'] },
		},
		description:
			'Each row ties an order-row ID to a received quantity. Brightpearl groups rows by order-row ID in the body (`goodsInNoteRows`); the node builds that grouping for you.',
		options: [
			{
				name: 'row',
				displayName: 'Row',
				values: [
					{
						displayName: 'Order Row ID',
						name: 'orderRowId',
						type: 'number',
						required: true,
						default: 0,
						description: 'The PO row this receipt applies to',
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						required: true,
						default: 1,
						description: 'Received quantity for this row',
					},
					{
						displayName: 'Batch Number',
						name: 'batchNumber',
						type: 'string',
						default: '',
						description: 'Optional batch number for the received stock',
					},
					{
						displayName: 'Expiry Date',
						name: 'expiryDate',
						type: 'string',
						default: '',
						description: 'Optional expiry date (ISO 8601, e.g. 2027-01-15)',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'goodsInAdditional',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: { resource: ['goodsInNote'], operation: ['create'] },
		},
		options: [
			{
				displayName: 'Parent Node ID',
				name: 'parentNodeId',
				type: 'number',
				default: 0,
				description: 'Parent goods-in note ID (if this is a child/correction)',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'boolean',
				default: false,
				description: 'Whether to flag this note as priority',
			},
			{
				displayName: 'Reference',
				name: 'ref',
				type: 'string',
				default: '',
				description: 'Free-text reference for the goods-in note',
			},
			{
				displayName: 'Released',
				name: 'released',
				type: 'boolean',
				default: true,
				description: 'Whether the receipt is released into stock immediately',
			},
			{
				displayName: 'Transfer ID',
				name: 'transferId',
				type: 'number',
				default: 0,
				description: 'If the goods-in is from an inter-warehouse transfer, the transfer ID',
			},
		],
	},

	// ─── SEARCH ──────────────────────────────────────────────────────────────
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: { resource: ['goodsInNote'], operation: ['search'] },
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Max Results',
		name: 'pageSize',
		type: 'number',
		default: 100,
		displayOptions: {
			show: { resource: ['goodsInNote'], operation: ['search'], returnAll: [false] },
		},
		description: 'How many rows per page (Brightpearl caps around 500)',
	},
	{
		displayName: 'First Result',
		name: 'firstResult',
		type: 'number',
		default: 1,
		displayOptions: {
			show: { resource: ['goodsInNote'], operation: ['search'], returnAll: [false] },
		},
		description: '1-indexed first row of the page to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: { resource: ['goodsInNote'], operation: ['search'] },
		},
		description:
			'Column-based filters passed to the goods-in-search endpoint. Column names come from Brightpearl\'s search metadata — common ones are listed here but any column can be used via Raw JSON.',
		options: [
			{
				displayName: 'Created After',
				name: 'createdOnFrom',
				type: 'string',
				default: '',
				description: 'ISO 8601 lower bound on createdOn',
			},
			{
				displayName: 'Created Before',
				name: 'createdOnTo',
				type: 'string',
				default: '',
				description: 'ISO 8601 upper bound on createdOn',
			},
			{
				displayName: 'Order ID',
				name: 'orderId',
				type: 'number',
				default: 0,
				description: 'Filter by the parent purchase order ID',
			},
			{
				displayName: 'Status ID',
				name: 'statusId',
				type: 'number',
				default: 0,
				description: 'Filter by goods-in status',
			},
			{
				displayName: 'Warehouse ID',
				name: 'warehouseId',
				type: 'number',
				default: 0,
				description: 'Filter by the receiving warehouse',
			},
		],
	},
];
