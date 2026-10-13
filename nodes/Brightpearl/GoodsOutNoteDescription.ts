import { INodeProperties } from 'n8n-workflow';

export const goodsOutNoteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['goodsOutNote'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description:
					'Create a goods-out note (shipping against a sales order) via POST /warehouse-service/order/{orderId}/goods-note/goods-out',
				action: 'Create a goods-out note',
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
					'Delete a goods-out note via DELETE /warehouse-service/order/{orderId}/goods-note/goods-out/{id}',
				action: 'Delete a goods-out note',
			},
			{
				name: 'Get',
				value: 'get',
				description:
					'Get one or more goods-out notes via GET /warehouse-service/order/{orderId}/goods-note/goods-out/{idSet}',
				action: 'Get a goods-out note',
			},
			{
				name: 'Mark Event',
				value: 'markEvent',
				description:
					'Add a lifecycle event (e.g. printed, shipped) via POST /warehouse-service/goods-note/goods-out/{id}/event',
				action: 'Mark a goods-out note event',
			},
			{
				name: 'Search',
				value: 'search',
				description:
					'Search goods-out notes via /warehouse-service/goods-out-search (column-based filters)',
				action: 'Search goods-out notes',
			},
		],
		default: 'create',
	},
];

export const goodsOutNoteFields: INodeProperties[] = [
	// ─── Shared Order ID (create / get / delete) ─────────────────────────────
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['goodsOutNote'],
				operation: ['create', 'get', 'delete'],
			},
		},
		description: 'The Brightpearl sales order ID the goods-out note belongs to',
	},

	// ─── GET: ID set ─────────────────────────────────────────────────────────
	{
		displayName: 'Goods-Out Note ID',
		name: 'goodsOutNoteId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: { resource: ['goodsOutNote'], operation: ['get'] },
		},
		description:
			'The goods-out note ID. ID set syntax supported: single (123), ascending range (100-199), or comma-separated list (1,2,3).',
	},

	// ─── DELETE: single ID ───────────────────────────────────────────────────
	{
		displayName: 'Goods-Out Note ID',
		name: 'goodsOutNoteIdSingle',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['goodsOutNote'], operation: ['delete'] },
		},
		description: 'The ID of the goods-out note to delete',
	},

	// ─── MARK EVENT ──────────────────────────────────────────────────────────
	{
		displayName: 'Goods-Out Note ID',
		name: 'goodsOutNoteIdForEvent',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['goodsOutNote'], operation: ['markEvent'] },
		},
		description: 'The ID of the goods-out note to add an event to',
	},
	{
		displayName: 'Event Code',
		name: 'eventCode',
		type: 'options',
		required: true,
		default: 'SHW',
		displayOptions: {
			show: { resource: ['goodsOutNote'], operation: ['markEvent'] },
		},
		description:
			'Which lifecycle event to record. Codes come from Brightpearl\'s goods-out note lifecycle — SHW (shipped) and GOP (printed) are the most common.',
		options: [
			{
				name: 'Shipped (SHW)',
				value: 'SHW',
				description: 'Mark the goods-out note as shipped',
			},
			{
				name: 'Printed (GOP)',
				value: 'GOP',
				description: 'Mark the goods-out note / pick list as printed',
			},
			{
				name: 'Packed (GON)',
				value: 'GON',
				description: 'Mark the goods-out note as packed',
			},
			{
				name: 'Picked (GOI)',
				value: 'GOI',
				description: 'Mark the goods-out note as picked',
			},
			{
				name: 'Despatched (SHD)',
				value: 'SHD',
				description: 'Mark the goods-out note as despatched',
			},
		],
	},
	{
		displayName: 'Occurred At',
		name: 'eventOccurred',
		type: 'string',
		default: '',
		displayOptions: {
			show: { resource: ['goodsOutNote'], operation: ['markEvent'] },
		},
		description:
			'ISO 8601 timestamp for when the event occurred (e.g. 2026-10-13T14:30:00+00:00). Leave empty to use the current time.',
	},
	{
		displayName: 'Event Owner ID',
		name: 'eventOwnerId',
		type: 'number',
		default: 0,
		displayOptions: {
			show: { resource: ['goodsOutNote'], operation: ['markEvent'] },
		},
		description:
			'Optional Brightpearl contact ID of the person responsible for the event (e.g. the staff member who shipped it). Leave 0 to omit.',
	},
	{
		displayName: 'Event Detail',
		name: 'eventDetail',
		type: 'string',
		default: '',
		displayOptions: {
			show: { resource: ['goodsOutNote'], operation: ['markEvent'] },
		},
		description: 'Optional free-text note attached to the event',
	},

	// ─── CREATE ───────────────────────────────────────────────────────────────
	{
		displayName: 'Warehouse ID',
		name: 'warehouseId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['goodsOutNote'], operation: ['create'] },
		},
		description: 'Warehouse from which the goods are being shipped',
	},
	{
		displayName: 'Release Date',
		name: 'releaseDate',
		type: 'string',
		default: '',
		displayOptions: {
			show: { resource: ['goodsOutNote'], operation: ['create'] },
		},
		description:
			'ISO 8601 release date for the goods-out note (e.g. 2026-10-13T10:00:00). Leave empty to let Brightpearl default it.',
	},
	{
		displayName: 'Rows',
		name: 'goodsOutRows',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Row',
		required: true,
		default: { row: [] },
		displayOptions: {
			show: { resource: ['goodsOutNote'], operation: ['create'] },
		},
		description:
			'Each row ties an order-row ID to a shipped quantity. The node builds Brightpearl\'s nested `orderRows` grouping automatically.',
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
						description: 'The SO row this shipment applies to',
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						required: true,
						default: 1,
						description: 'Shipped quantity for this row',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'goodsOutAdditional',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: { resource: ['goodsOutNote'], operation: ['create'] },
		},
		options: [
			{
				displayName: 'Carrier Name',
				name: 'carrierName',
				type: 'string',
				default: '',
				description: 'Name of the shipping carrier (e.g. FedEx, UPS). Sent inside the `carrier` object.',
			},
			{
				displayName: 'Carrier Reference',
				name: 'carrierReference',
				type: 'string',
				default: '',
				description: 'Tracking number or carrier-specific reference',
			},
			{
				displayName: 'Boxes',
				name: 'boxes',
				type: 'number',
				default: 1,
				description: 'Number of boxes in the shipment (part of the `carrier` block)',
			},
			{
				displayName: 'Label URI',
				name: 'labelUri',
				type: 'string',
				default: '',
				description: 'URI pointing to a printable shipping label PDF/PNG',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'boolean',
				default: false,
				description: 'Whether to flag this goods-out note as priority',
			},
			{
				displayName: 'Transfer',
				name: 'transfer',
				type: 'boolean',
				default: false,
				description: 'Whether this goods-out is for an inter-warehouse transfer',
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
			show: { resource: ['goodsOutNote'], operation: ['search'] },
		},
		description:
			'Fetch every matching page (respects filters and rate limits). When off, returns a single page starting at First Result.',
	},
	{
		displayName: 'Max Results',
		name: 'pageSize',
		type: 'number',
		default: 100,
		displayOptions: {
			show: { resource: ['goodsOutNote'], operation: ['search'], returnAll: [false] },
		},
		description: 'How many rows per page (Brightpearl caps around 500)',
	},
	{
		displayName: 'First Result',
		name: 'firstResult',
		type: 'number',
		default: 1,
		displayOptions: {
			show: { resource: ['goodsOutNote'], operation: ['search'], returnAll: [false] },
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
			show: { resource: ['goodsOutNote'], operation: ['search'] },
		},
		description:
			'Column-based filters passed to the goods-out-search endpoint. Any Brightpearl search column may be used.',
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
				description: 'Filter by parent sales order ID',
			},
			{
				displayName: 'Shipping Status',
				name: 'shippingStatus',
				type: 'number',
				default: 0,
				description: 'Filter by shipping status ID',
			},
			{
				displayName: 'Warehouse ID',
				name: 'warehouseId',
				type: 'number',
				default: 0,
				description: 'Filter by shipping warehouse',
			},
		],
	},
];
