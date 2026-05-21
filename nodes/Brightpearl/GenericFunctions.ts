import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IDataObject,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

export async function brightpearlApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body?: IDataObject | IDataObject[],
	qs: IDataObject = {},
	extraHeaders: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('brightpearlApi');

	const options: IHttpRequestOptions = {
		method,
		url: `https://${credentials.datacenter}/public-api/${credentials.accountCode}${resource}`,
		headers: {
			'Content-Type': 'application/json',
			...extraHeaders,
		},
		qs,
		json: true,
	};

	if (body !== undefined) {
		options.body = body as IDataObject;
	}

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'brightpearlApi',
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as unknown as JsonObject);
	}
}

interface BrightpearlSearchColumn {
	name: string;
	referenceData?: string[];
}

/**
 * Build the sibling key for a resolved reference value. Columns like
 * `orderStatusId` -> `orderStatusName` (strip Id, add Name). Anything else
 * gets a `Label` suffix.
 */
function refLabelKey(columnName: string): string {
	if (columnName.endsWith('Id')) return columnName.slice(0, -2) + 'Name';
	return columnName + 'Label';
}

/**
 * Brightpearl search endpoints return results as positional arrays, and the
 * top-level `reference` block maps coded IDs (e.g. orderStatusId=5) to display
 * names. This converts each row to a keyed object AND attaches resolved label
 * fields for any column whose metaData declares `referenceData`.
 */
export function searchResultsToObjects(response: IDataObject): IDataObject[] {
	const inner = response?.response as IDataObject | undefined;
	const metaData = inner?.metaData as IDataObject | undefined;
	const results = inner?.results as unknown[][] | undefined;
	const referenceData = response?.reference as IDataObject | undefined;

	if (!metaData?.columns || !results) return [];

	const columns = metaData.columns as BrightpearlSearchColumn[];

	return results.map((row) => {
		const obj: IDataObject = {};

		columns.forEach((col, idx) => {
			const value = row[idx];
			obj[col.name] = value as IDataObject[keyof IDataObject];

			// Resolve reference data labels (e.g. orderStatusId=5 -> orderStatusName="Complete - Cancelled")
			if (!col.referenceData?.length || !referenceData) return;
			if (value === null || value === undefined) return;

			const refKey = col.referenceData[0];
			const refTable = referenceData[refKey] as IDataObject | undefined;
			if (!refTable) return;

			const label = refTable[String(value)];
			if (label === undefined) return;

			obj[refLabelKey(col.name)] = label as IDataObject[keyof IDataObject];
		});

		return obj;
	});
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

		// Brightpearl tells us directly whether there are more pages.
		const metaData = (response?.response as IDataObject)?.metaData as IDataObject | undefined;
		hasMore = (metaData?.morePagesAvailable as boolean) ?? false;
		firstResult += pageSize;
	}

	return allResults;
}
