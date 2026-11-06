import { INodeProperties } from 'n8n-workflow';

export const stockTransferOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['stockTransfer'] } },
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
				description:
					'Get one or more stock transfers via GET /warehouse-service/stock-transfer/{idSet}',
				action: 'Get a stock transfer',
			},
		],
		default: 'get',
	},
];

export const stockTransferFields: INodeProperties[] = [
	// ─── GET ─────────────────────────────────────────────────────────────────
	{
		displayName: 'Stock Transfer ID',
		name: 'stockTransferId',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['stockTransfer'], operation: ['get'] } },
		description:
			'The stock transfer ID. ID set syntax supported: single (1), ascending range (1-10), or comma-separated list (1,2,3). **Leave empty to fetch every stock transfer on the account** (Brightpearl supports this natively — no pagination on this endpoint, so expect one response containing every transfer). Each transfer returns as its own output item.',
	},
	{
		displayName: 'Include Created By Contact Name',
		name: 'includeCreatedByName',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['stockTransfer'], operation: ['get'] } },
		description:
			'Whether to make an additional call to /contact-service/contact for each unique createdBy ID and add a `createdByName` field to each transfer. Unique IDs are deduped so this costs exactly one extra API call regardless of how many transfers were fetched. If the contact lookup fails (rate limit, permissions, etc.) the transfer is returned without the name — the error message goes into `_contactLookupError` rather than failing the whole operation.',
	},
];
