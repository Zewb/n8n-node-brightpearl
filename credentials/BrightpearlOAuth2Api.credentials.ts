import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class BrightpearlOAuth2Api implements ICredentialType {
	name = 'brightpearlOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'Brightpearl OAuth2 API';
	documentationUrl = 'https://api-docs.brightpearl.com/';
	icon = 'file:brightpearl.svg' as const;

	properties: INodeProperties[] = [
		// User-facing config
		{
			displayName: 'Account Code',
			name: 'accountCode',
			type: 'string',
			required: true,
			default: '',
			description: 'Your Brightpearl account code (subdomain part of your URL)',
		},
		{
			displayName: 'Datacenter Hostname',
			name: 'datacenter',
			type: 'options',
			options: [
				{ name: 'AP1', value: 'ws-ap1.brightpearl.com' },
				{ name: 'EU', value: 'ws-eu1.brightpearl.com' },
				{ name: 'EU New', value: 'euw1.brightpearlconnect.com' },
				{ name: 'US East', value: 'ws-use.brightpearl.com' },
				{ name: 'US East New', value: 'use1.brightpearlconnect.com' },
			],
			default: 'ws-eu1.brightpearl.com',
			required: true,
			description: 'The API datacenter for your account',
		},
		{
			displayName: 'App Reference',
			name: 'appReference',
			type: 'string',
			required: true,
			default: '',
			description:
				'Your registered app reference. Sent as the brightpearl-app-ref header alongside the OAuth Bearer token.',
		},
		{
			displayName: 'Developer Reference',
			name: 'devReference',
			type: 'string',
			required: true,
			default: '',
			description:
				'Your developer reference. Sent as the brightpearl-dev-ref header (required for public apps).',
		},

		// Overrides for the inherited oAuth2Api credential. These pin Brightpearl-specific
		// endpoints and behaviors; they are hidden because users should not edit them.
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '=https://oauth.brightpearl.com/authorize/{{$self.accountCode}}',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '=https://oauth.brightpearlapp.com/token/{{$self.accountCode}}',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
