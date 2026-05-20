import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IDataObject,
	NodeApiError,
} from 'n8n-workflow';

export async function brightpearlApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body?: IDataObject | IDataObject[],
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('brightpearlApi');

	const options: IHttpRequestOptions = {
		method,
		url: `https://${credentials.datacenter}/public-api/${credentials.accountCode}${resource}`,
		headers: {
			'brightpearl-app-ref': credentials.appReference as string,
			'brightpearl-staff-token': credentials.staffToken as string,
			'Content-Type': 'application/json',
		},
		qs,
		json: true,
	};

	if (body !== undefined) {
		options.body = body as IDataObject;
	}

	try {
		return (await this.helpers.httpRequest(options)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as unknown as NodeApiError);
	}
}

/**
 * Brightpearl search endpoints return results as positional arrays.
 * This converts them to named-key objects using the metaData.columns list.
 */
export function searchResultsToObjects(response: IDataObject): IDataObject[] {
	const inner = response?.response as IDataObject | undefined;
	const metaData = inner?.metaData as IDataObject | undefined;
	const results = inner?.results as unknown[][] | undefined;

	if (!metaData?.columns || !results) return [];

	const columns = (metaData.columns as Array<IDataObject | string>).map((c) =>
		typeof c === 'string' ? c : (c.name as string),
	);

	return results.map((row) =>
		Object.fromEntries(columns.map((col, idx) => [col, row[idx]])) as IDataObject,
	);
}

export async function brightpearlApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const allResults: IDataObject[] = [];
	let firstResult = 1;
	const pageSize = 200;
	let hasMore = true;

	while (hasMore) {
		const response = await brightpearlApiRequest.call(this, method, resource, undefined, {
			...qs,
			firstResult,
			pageSize,
		});

		const batch = searchResultsToObjects(response);
		allResults.push(...batch);

		const metaData = (response?.response as IDataObject)?.metaData as IDataObject | undefined;
		const totalResults = (metaData?.totalResults as number) ?? 0;
		firstResult += pageSize;
		hasMore = firstResult <= totalResults;
	}

	return allResults;
}
