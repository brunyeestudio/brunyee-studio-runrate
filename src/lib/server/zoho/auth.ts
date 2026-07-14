import type { ZohoEnv } from './env';

export interface ZohoToken {
	accessToken: string;
	expiresAt: number;
}

/** Persisted OAuth tokens (cookie-backed TokenStore). */
export interface StoredZohoTokens {
	refreshToken: string;
	accessToken: string;
	expiresAt: number;
	accountsUrl?: string;
	apiBaseUrl?: string;
}

export interface TokenStore {
	get(): StoredZohoTokens | null;
	set(tokens: StoredZohoTokens): void;
	clear(): void;
}

/** @deprecated Prefer TokenStore; kept for tests and warm-instance caching. */
export interface TokenCache {
	get(): ZohoToken | null;
	set(token: ZohoToken): void;
	clear(): void;
}

export class ZohoAuthError extends Error {
	constructor(message = 'Zoho Books is not connected. Connect to continue.') {
		super(message);
		this.name = 'ZohoAuthError';
	}
}

export function createMemoryTokenCache(): TokenCache {
	let cached: ZohoToken | null = null;
	return {
		get: () => cached,
		set: (token) => {
			cached = token;
		},
		clear: () => {
			cached = null;
		}
	};
}

export function createMemoryTokenStore(initial: StoredZohoTokens | null = null): TokenStore {
	let stored: StoredZohoTokens | null = initial;
	return {
		get: () => stored,
		set: (tokens) => {
			stored = tokens;
		},
		clear: () => {
			stored = null;
		}
	};
}

/** Refresh skew so we renew slightly before Zoho expiry. */
const EXPIRY_SKEW_MS = 60_000;

export function isTokenValid(token: ZohoToken | null, now = Date.now()): boolean {
	if (!token?.accessToken) return false;
	return token.expiresAt - EXPIRY_SKEW_MS > now;
}

interface TokenResponse {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number;
	api_domain?: string;
	error?: string;
	error_description?: string;
}

function parseTokenResponse(
	data: TokenResponse,
	response: Response
): {
	accessToken: string;
	expiresAt: number;
	refreshToken?: string;
	apiBaseUrl?: string;
} {
	if (!response.ok || !data.access_token) {
		const detail = data.error_description || data.error || response.statusText;
		throw new Error(`Zoho token request failed: ${detail}`);
	}

	const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 3600;
	const apiDomain = data.api_domain?.replace(/\/$/, '');
	return {
		accessToken: data.access_token,
		expiresAt: Date.now() + expiresInSec * 1000,
		refreshToken: data.refresh_token,
		apiBaseUrl: apiDomain ? `${apiDomain}/books/v3` : undefined
	};
}

export async function refreshAccessToken(
	env: Pick<ZohoEnv, 'clientId' | 'clientSecret' | 'accountsUrl'>,
	refreshToken: string,
	fetchImpl: typeof fetch = fetch
): Promise<ZohoToken & { apiBaseUrl?: string }> {
	const body = new URLSearchParams({
		refresh_token: refreshToken,
		client_id: env.clientId,
		client_secret: env.clientSecret,
		grant_type: 'refresh_token'
	});

	const response = await fetchImpl(`${env.accountsUrl}/oauth/v2/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body
	});

	const data = (await response.json()) as TokenResponse;
	const parsed = parseTokenResponse(data, response);
	return {
		accessToken: parsed.accessToken,
		expiresAt: parsed.expiresAt,
		apiBaseUrl: parsed.apiBaseUrl
	};
}

export async function exchangeAuthorizationCode(
	env: Pick<ZohoEnv, 'clientId' | 'clientSecret' | 'accountsUrl' | 'redirectUri'>,
	code: string,
	fetchImpl: typeof fetch = fetch
): Promise<StoredZohoTokens> {
	const body = new URLSearchParams({
		code,
		client_id: env.clientId,
		client_secret: env.clientSecret,
		redirect_uri: env.redirectUri,
		grant_type: 'authorization_code'
	});

	const response = await fetchImpl(`${env.accountsUrl}/oauth/v2/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body
	});

	const data = (await response.json()) as TokenResponse;
	const parsed = parseTokenResponse(data, response);
	if (!parsed.refreshToken) {
		throw new Error(
			'Zoho did not return a refresh token. Re-authorize with access_type=offline and prompt=consent.'
		);
	}

	return {
		refreshToken: parsed.refreshToken,
		accessToken: parsed.accessToken,
		expiresAt: parsed.expiresAt,
		accountsUrl: env.accountsUrl,
		apiBaseUrl: parsed.apiBaseUrl
	};
}

export async function getAccessToken(
	env: Pick<ZohoEnv, 'clientId' | 'clientSecret' | 'accountsUrl'>,
	options: {
		store: TokenStore;
		fetchImpl?: typeof fetch;
		now?: number;
	}
): Promise<string> {
	const { store } = options;
	const now = options.now ?? Date.now();
	const existing = store.get();
	if (!existing?.refreshToken) {
		throw new ZohoAuthError();
	}

	if (isTokenValid(existing, now)) {
		return existing.accessToken;
	}

	const accountsUrl = existing.accountsUrl ?? env.accountsUrl;
	const token = await refreshAccessToken(
		{ ...env, accountsUrl },
		existing.refreshToken,
		options.fetchImpl ?? fetch
	);

	store.set({
		refreshToken: existing.refreshToken,
		accessToken: token.accessToken,
		expiresAt: token.expiresAt,
		accountsUrl,
		apiBaseUrl: token.apiBaseUrl ?? existing.apiBaseUrl
	});

	return token.accessToken;
}
