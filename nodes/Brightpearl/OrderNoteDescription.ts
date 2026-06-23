import { INodeProperties } from 'n8n-workflow';

export const orderNoteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['orderNote'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description:
					'Add a note to an existing order via POST /order-service/order/{orderId}/note',
				action: 'Add a note to an order',
			},
			{
				name: 'Custom API Call',
				value: 'customApiCall',
				description:
					'See the notice below — use the HTTP Request node for endpoints not yet wired up here',
				action: 'Custom API call',
			},
		],
		default: 'create',
	},
];

export const orderNoteFields: INodeProperties[] = [
	// ─── CREATE ───────────────────────────────────────────────────────────────
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['orderNote'], operation: ['create'] } },
		description: 'The Brightpearl order ID to attach the note to',
	},
	{
		displayName: 'Note Text',
		name: 'noteText',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		displayOptions: { show: { resource: ['orderNote'], operation: ['create'] } },
		description: 'The body of the note',
	},
	{
		displayName: 'Additional Fields',
		name: 'addNoteAdditional',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['orderNote'], operation: ['create'] } },
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
];
