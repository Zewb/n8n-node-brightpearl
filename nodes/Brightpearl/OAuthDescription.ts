import { INodeProperties } from 'n8n-workflow';

export const oauthOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['oauth'] } },
		options: [
			{
				name: 'Custom API Call',
				value: 'customApiCall',
				description:
					'See the notice below — use the HTTP Request node for endpoints not yet wired up here',
				action: 'Custom API call',
			},
			{
				name: 'Introspect',
				value: 'introspect',
				description:
					'Call POST /utilities/oauth-token-introspect to inspect the active status, issue time (iat), and expiry (exp) of a stored OAuth2 token. Requires OAuth2 authentication.',
				action: 'Introspect an OAuth2 token',
			},
		],
		default: 'introspect',
	},
];

export const oauthFields: INodeProperties[] = [
	{
		displayName: 'Token Type',
		name: 'introspectTokenType',
		type: 'options',
		default: 'access_token',
		displayOptions: {
			show: { resource: ['oauth'], operation: ['introspect'] },
		},
		options: [
			{
				name: 'Access Token',
				value: 'access_token',
				description:
					'Introspect the stored access_token. Expiry (exp) tells you how long until the next auto-refresh is required.',
			},
			{
				name: 'Refresh Token',
				value: 'refresh_token',
				description:
					'Introspect the stored refresh_token. Expiry (exp) tells you how long until the user must reconnect the credential. If `active` is false, Brightpearl has already invalidated this token (likely rotated by a previous refresh).',
			},
			{
				name: 'Cached Refreshed Token',
				value: 'cached',
				description:
					'Introspect the in-process cached access token the node refreshed most recently (if present). Useful for confirming the node is reusing a refreshed token across calls rather than refreshing on every request.',
			},
		],
		description: 'Which stored token to introspect',
	},
	{
		displayName: 'Include Computed Fields',
		name: 'includeComputed',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: { resource: ['oauth'], operation: ['introspect'] },
		},
		description:
			'Whether to enrich the response with human-friendly computed fields: secondsUntilExpiry, expiryDateTime (ISO 8601), issuedDateTime (ISO 8601), ageSeconds. Based on the exp and iat timestamps from the introspection response.',
	},
];
