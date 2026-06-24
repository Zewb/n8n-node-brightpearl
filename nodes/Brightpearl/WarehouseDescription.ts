import { INodeProperties } from 'n8n-workflow';

export const warehouseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['warehouse'] } },
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
				value: 'getMany',
				description: 'List all warehouses on the account (handy for finding warehouse IDs)',
				action: 'Get many warehouses',
			},
			{
				name: 'Get Product Availability',
				value: 'getAvailability',
				description: 'Get stock availability (on-hand / available / allocated / in-transit) for one or more products',
				action: 'Get product availability',
			},
		],
		default: 'getAvailability',
	},
];

export const warehouseFields: INodeProperties[] = [
	// ─── GET PRODUCT AVAILABILITY ────────────────────────────────────────────
	{
		displayName: 'Product IDs',
		name: 'productIds',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: { resource: ['warehouse'], operation: ['getAvailability'] },
		},
		description:
			'Brightpearl product IDs. ID set syntax supported: single (123), ascending range (100-199), or comma-separated list (1,2,3). Brightpearl caps requests at roughly 100 IDs per call.',
	},
	{
		displayName: 'Include Optional Data',
		name: 'includeOptional',
		type: 'multiOptions',
		default: [],
		displayOptions: {
			show: { resource: ['warehouse'], operation: ['getAvailability'] },
		},
		description:
			'Optional sections to include in the response, sent as `?includeOptional=...`. Leave empty for the default summary payload',
		options: [
			{
				name: 'Allocated Orders',
				value: 'allocatedOrders',
				description: 'Quantities allocated to specific sales orders',
			},
			{
				name: 'Allocated Transfers',
				value: 'allocatedTransfers',
				description: 'Quantities allocated to inter-warehouse transfers',
			},
			{
				name: 'Break Down By Location',
				value: 'breakDownByLocation',
				description: 'Per-warehouse breakdown of stock (auto-enabled when Warehouse ID is set)',
			},
			{
				name: 'On Order',
				value: 'onOrder',
				description: 'Quantities on incoming purchase orders',
			},
		],
	},
	{
		displayName: 'Warehouse ID',
		name: 'availabilityWarehouseId',
		type: 'number',
		default: 0,
		displayOptions: {
			show: { resource: ['warehouse'], operation: ['getAvailability'] },
		},
		description:
			'Optional client-side filter. If set, the node automatically requests Break Down By Location and then strips out warehouses other than this one from each product\'s response. Leave at 0 to return all warehouses',
	},
];
