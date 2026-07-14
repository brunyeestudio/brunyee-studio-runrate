import { getAccessToken, ZohoAuthError, type TokenStore } from './auth';
import { readZohoEnv, type ZohoEnv } from './env';

export class ZohoApiError extends Error {
	status: number;
	code?: number | string;

	constructor(message: string, status: number, code?: number | string) {
		super(message);
		this.name = 'ZohoApiError';
		this.status = status;
		this.code = code;
	}
}

export type QueryValue = string | number | boolean | undefined | null;

export function buildZohoUrl(
	apiBaseUrl: string,
	path: string,
	organizationId: string,
	query: Record<string, QueryValue> = {}
): string {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	const url = new URL(`${apiBaseUrl}${normalizedPath}`);
	url.searchParams.set('organization_id', organizationId);
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null || value === '') continue;
		url.searchParams.set(key, String(value));
	}
	return url.toString();
}

export interface ZohoClientOptions {
	env?: ZohoEnv;
	store?: TokenStore;
	fetchImpl?: typeof fetch;
}

function resolveEnv(env: ZohoEnv, store: TokenStore): ZohoEnv {
	const tokens = store.get();
	return {
		...env,
		accountsUrl: tokens?.accountsUrl ?? env.accountsUrl,
		apiBaseUrl: tokens?.apiBaseUrl ?? env.apiBaseUrl
	};
}

export async function zohoFetch<T>(
	path: string,
	query: Record<string, QueryValue> = {},
	options: ZohoClientOptions = {}
): Promise<T> {
	const env = options.env ?? readZohoEnv();
	const fetchImpl = options.fetchImpl ?? fetch;
	const store = options.store;
	if (!store) {
		throw new ZohoAuthError();
	}

	const effectiveEnv = resolveEnv(env, store);
	const accessToken = await getAccessToken(effectiveEnv, {
		store,
		fetchImpl
	});

	const url = buildZohoUrl(effectiveEnv.apiBaseUrl, path, effectiveEnv.organizationId, query);
	const response = await fetchImpl(url, {
		method: 'GET',
		headers: {
			Authorization: `Zoho-oauthtoken ${accessToken}`,
			Accept: 'application/json'
		}
	});

	const data = (await response.json()) as T & {
		code?: number;
		message?: string;
	};

	if (!response.ok) {
		throw new ZohoApiError(
			data.message || `Zoho API request failed (${response.status})`,
			response.status,
			data.code
		);
	}

	if (typeof data.code === 'number' && data.code !== 0) {
		throw new ZohoApiError(
			data.message || 'Zoho API returned an error',
			response.status,
			data.code
		);
	}

	return data;
}
