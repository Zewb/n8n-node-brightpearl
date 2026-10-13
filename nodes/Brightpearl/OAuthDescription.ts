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
					'Call POST https://{datacenter}/oauth/token/introspect (RFC 7662) to inspect the active status, issue time (iat), and expiry (exp) of a stored OAuth2 token. Requires OAuth2 authentication.',
				action: 'Introspect a token',
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
					'Attempt to introspect the stored refresh_token. Per Brightpearl\'s docs, this endpoint does not currently return information about refresh tokens — expect `active: false` or minimal fields. Kept here for completeness and to verify what Brightpearl actually returns.',
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
