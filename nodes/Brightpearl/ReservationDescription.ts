import { INodeProperties } from 'n8n-workflow';

export const reservationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['reservation'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description:
					'Reserve stock against an order via POST /warehouse-service/order/{orderId}/reservation',
				action: 'Create a reservation',
			},
			{
				name: 'Custom API Call',
				value: 'customApiCall',
				description:
					'See the notice below — use the HTTP Request node for endpoints not yet wired up here',
				action: 'Custom API call',
			},
			{
				name: 'Release All',
				value: 'releaseAll',
				description:
					'Release every reserved row on an order via DELETE /warehouse-service/order/{orderId}/reservation',
				action: 'Release all reservations on an order',
			},
			{
				name: 'Release Row',
				value: 'releaseRow',
				description:
					'Release reservation on a single order row via DELETE /warehouse-service/order/{orderId}/reservation/{orderRowId}',
				action: 'Release a specific reservation row',
			},
		],
		default: 'create',
	},
];

export const reservationFields: INodeProperties[] = [
	// ─── Shared Order ID ─────────────────────────────────────────────────────
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['reservation'],
				operation: ['create', 'releaseAll', 'releaseRow'],
			},
		},
		description: 'The Brightpearl order ID the reservation(s) attach to',
	},

	// ─── CREATE ───────────────────────────────────────────────────────────────
	{
		displayName: 'Warehouse ID',
		name: 'warehouseId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['reservation'], operation: ['create'] },
		},
		description: 'Warehouse where stock is being reserved from',
	},
	{
		displayName: 'Rows',
		name: 'reservationRows',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Row',
		required: true,
		default: { row: [] },
		displayOptions: {
			show: { resource: ['reservation'], operation: ['create'] },
		},
		description:
			'Each row ties an order-row ID to a reserved quantity. Brightpearl expects an `orderRows` object keyed by order-row ID; the node builds that for you.',
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
						description: 'The order row to reserve stock for',
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						required: true,
						default: 1,
						description: 'How many units to reserve for this row',
					},
				],
			},
		],
	},

	// ─── RELEASE ROW ─────────────────────────────────────────────────────────
	{
		displayName: 'Order Row ID',
		name: 'orderRowIdToRelease',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['reservation'], operation: ['releaseRow'] },
		},
		description: 'The specific order-row ID whose reservation should be released',
	},
];
