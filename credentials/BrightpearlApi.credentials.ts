import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BrightpearlApi implements ICredentialType {
	name = 'brightpearlApi';
	displayName = 'Brightpearl API';
	icon = 'file:brightpearl.svg' as const;
	documentationUrl = 'https://api-docs.brightpearl.com/';
	properties: INodeProperties[] = [
		{
			displayName: 'Account Code',
			name: 'accountCode',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Brightpearl account code (e.g. "mycompany")',
		},
		{
			displayName: 'Datacenter Hostname',
			name: 'datacenter',
			type: 'options',
			options: [
				{
					name: 'AP1',
					value: 'ws-ap1.brightpearl.com',
				},
				{
					name: 'EU',
					value: 'ws-eu1.brightpearl.com',
				},
				{
					name: 'EU New',
					value: 'euw1.brightpearlconnect.com',
				},
				{
					name: 'US East',
					value: 'ws-use.brightpearl.com',
				},
				{
					name: 'US East New',
					value: 'use1.brightpearlconnect.com',
				},
			],
			default: 'ws-eu1.brightpearl.com',
			required: true,
			description: 'Your Brightpearl datacenter. Check your account URL if unsure.',
		},
		{
			displayName: 'Account Token',
			name: 'accountToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Account-level authentication token (brightpearl-account-token header). Issued when you create the private app under Apps > Private Apps.',
		},
		{
			displayName: 'App Reference',
			name: 'appReference',
			type: 'string',
			default: '',
			required: true,
			description:
				'Your private app reference (brightpearl-app-ref header). Set when you create the private app in Brightpearl.',
		},
		{
			displayName: 'Staff Token',
			name: 'staffToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Staff authentication token (brightpearl-staff-token header)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'brightpearl-account-token': '={{$credentials.accountToken}}',
				'brightpearl-app-ref': '={{$credentials.appReference}}',
				'brightpearl-staff-token': '={{$credentials.staffToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.datacenter}}/public-api/{{$credentials.accountCode}}',
			url: '/product-service/price-list',
			headers: {
				'brightpearl-account-token': '={{$credentials.accountToken}}',
				'brightpearl-app-ref': '={{$credentials.appReference}}',
				'brightpearl-staff-token': '={{$credentials.staffToken}}',
			},
		},
	};
}
