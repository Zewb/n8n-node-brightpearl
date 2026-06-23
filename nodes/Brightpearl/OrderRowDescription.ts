import { INodeProperties } from 'n8n-workflow';

export const orderRowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['orderRow'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description:
					'Add a row to an existing order via POST /order-service/order/{orderId}/row',
				action: 'Create an order row',
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
					'Remove a row from an order via DELETE /order-service/order/{orderId}/row/{rowId}',
				action: 'Delete an order row',
			},
			{
				name: 'Update',
				value: 'update',
				description:
					'Modify an existing row via PATCH /order-service/order/{orderId}/row/{rowId} with a JSON Patch body',
				action: 'Update an order row',
			},
		],
		default: 'create',
	},
];

export const orderRowFields: INodeProperties[] = [
	// ─── Shared: Order ID (required for all real ops) ────────────────────────
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['orderRow'], operation: ['create', 'update', 'delete'] },
		},
		description: 'The Brightpearl order ID the row belongs to',
	},
	// ─── Shared: Row ID (required for update / delete) ───────────────────────
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['orderRow'], operation: ['update', 'delete'] },
		},
		description: 'The Brightpearl order row ID to modify or delete',
	},

	// ─── CREATE ───────────────────────────────────────────────────────────────
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['orderRow'], operation: ['create'] } },
		description: 'The product ID to add as a row',
	},
	{
		displayName: 'Quantity',
		name: 'quantity',
		type: 'number',
		required: true,
		default: 1,
		displayOptions: { show: { resource: ['orderRow'], operation: ['create'] } },
		description: 'How many units of the product to add',
	},
	{
		displayName: 'Additional Fields',
		name: 'rowAdditional',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['orderRow'], operation: ['create'] } },
		options: [
			{
				displayName: 'Discount Percentage',
				name: 'discountPercentage',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 4 },
				description: 'Discount applied to this row, as a percentage',
			},
			{
				displayName: 'Net',
				name: 'net',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 4 },
				description: 'Net (ex-tax) row total',
			},
			{
				displayName: 'Nominal Code',
				name: 'nominalCode',
				type: 'string',
				default: '',
				description: 'Accounting nominal code for this row (e.g. 4000)',
			},
			{
				displayName: 'Product Price',
				name: 'productPrice',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 4 },
				description: 'Per-unit product price',
			},
			{
				displayName: 'Tax',
				name: 'tax',
				type: 'number',
				default: 0,
				typeOptions: { numberPrecision: 4 },
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

	// ─── UPDATE (JSON Patch) ─────────────────────────────────────────────────
	{
		displayName: 'JSON Patch',
		name: 'rowRawPatch',
		type: 'string',
		typeOptions: { rows: 8 },
		default:
			'[\n  {\n    "op": "replace",\n    "path": "/quantity",\n    "value": 5\n  }\n]',
		displayOptions: {
			show: { resource: ['orderRow'], operation: ['update'] },
		},
		description:
			'A raw RFC 6902 JSON Patch array sent to PATCH /order-service/order/{orderId}/row/{rowId}. Toggle expression mode to use expressions. Each op needs op (add / replace / remove), path (e.g. "/quantity", "/net", "/taxCode"), and value. Strings stay quoted; numbers/booleans go unquoted',
	},
];
