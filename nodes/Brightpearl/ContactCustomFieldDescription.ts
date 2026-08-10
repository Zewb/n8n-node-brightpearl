import { INodeProperties } from 'n8n-workflow';

export const contactCustomFieldOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['contactCustomField'] } },
		options: [
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
				description: 'Get all custom fields set on a specific contact',
				action: 'Get custom fields on a contact',
			},
			{
				name: 'Get Metadata',
				value: 'getMetadata',
				description:
					'List every contact custom field definition (code, name, type, and for SELECT/list fields the available option IDs + labels). Run this to discover what to send in Update.',
				action: 'Get contact custom field metadata',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update one or more custom fields on a contact',
				action: 'Update custom fields on a contact',
			},
		],
		default: 'get',
	},
];

export const contactCustomFieldFields: INodeProperties[] = [
	// ─── GET METADATA ────────────────────────────────────────────────────────
	{
		displayName: 'Contact Type',
		name: 'metaContactType',
		type: 'options',
		default: 'customer',
		displayOptions: {
			show: { resource: ['contactCustomField'], operation: ['getMetadata'] },
		},
		options: [
			{ name: 'Customer', value: 'customer' },
			{ name: 'Supplier', value: 'supplier' },
		],
		description: 'Which contact type to fetch custom field definitions for',
	},

	// ─── GET / UPDATE — Contact ID ───────────────────────────────────────────
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['contactCustomField'], operation: ['get', 'update'] },
		},
		description: 'The Brightpearl contact ID',
	},

	// ─── UPDATE ──────────────────────────────────────────────────────────────
	{
		displayName: 'Input Mode',
		name: 'customFieldInputMode',
		type: 'options',
		default: 'fields',
		displayOptions: {
			show: { resource: ['contactCustomField'], operation: ['update'] },
		},
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
				resource: ['contactCustomField'],
				operation: ['update'],
				customFieldInputMode: ['fields'],
			},
		},
		description: 'Each entry becomes one JSON Patch operation against the contact custom fields',
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
						description: 'The custom field code, used as the patch path (e.g. CCF_LOYALTY_TIER)',
					},
					{
						displayName: 'Value Type',
						name: 'valueType',
						type: 'options',
						default: 'text',
						description:
							'The Brightpearl type of this custom field. Must match, or Brightpearl returns a 500. Text covers TEXT/TEXTAREA and DATE (send dates as "yyyy-MM-dd"); Boolean for YES_NO; Number for INTEGER; List/Select for SELECT fields (enter the option ID — use Get Metadata to find it). Ignored for Remove.',
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
			'[\n  {\n    "op": "add",\n    "path": "/CCF_EXAMPLE",\n    "value": "your value"\n  }\n]',
		displayOptions: {
			show: {
				resource: ['contactCustomField'],
				operation: ['update'],
				customFieldInputMode: ['raw'],
			},
		},
		description:
			'A raw RFC 6902 JSON Patch array sent to the contact custom-field endpoint. Toggle expression mode on the field to use expressions. Each op needs op (add / replace / remove), path ("/FIELD_CODE"), and value. The value MUST match the field type: strings stay inside quotes; booleans and numbers go UNQUOTED so they become JSON true/false/123 not string "true"; SELECT fields take an object containing the numeric option ID. A type mismatch makes Brightpearl return a 500. The Builder mode handles all coercion automatically — use Raw only when you need RFC 6902 control (mixing ops, etc).',
	},
];
