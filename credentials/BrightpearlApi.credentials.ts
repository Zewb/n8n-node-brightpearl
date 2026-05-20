import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BrightpearlApi implements ICredentialType {
	name = 'brightpearlApi';
	displayName = 'Brightpearl API';
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
					name: 'EU (ws-eu1.brightpearl.com)',
					value: 'ws-eu1.brightpearl.com',
				},
				{
					name: 'EU New (euw1.brightpearlconnect.com)',
					value: 'euw1.brightpearlconnect.com',
				},
				{
					name: 'US East (ws-use.brightpearl.com)',
					value: 'ws-use.brightpearl.com',
				},
				{
					name: 'US East New (use1.brightpearlconnect.com)',
					value: 'use1.brightpearlconnect.com',
				},
				{
					name: 'AP1 (ws-ap1.brightpearl.com)',
					value: 'ws-ap1.brightpearl.com',
				},
			],
			default: 'ws-eu1.brightpearl.com',
			required: true,
			description: 'Your Brightpearl datacenter. Check your account URL if unsure.',
		},
		{
			displayName: 'App Reference',
			name: 'appReference',
			type: 'string',
			default: '',
			required: true,
			description:
				'Your private app reference (brightpearl-app-ref header). Create this in Brightpearl under Apps > Private Apps.',
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
				'brightpearl-app-ref': '={{$credentials.appReference}}',
				'brightpearl-staff-token': '={{$credentials.staffToken}}',
			},
		},
	};
}
