import { exchangeAuthorizationCode, type StoredZohoTokens } from './auth';
import type { ZohoEnv } from './env';

export const ZOHO_OAUTH_SCOPES = 'ZohoBooks.invoices.READ,ZohoBooks.projects.READ';

export function createOAuthState(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(24));
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildAuthorizeUrl(env: ZohoEnv, state: string): string {
	const url = new URL(`${env.accountsUrl}/oauth/v2/auth`);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', env.clientId);
	url.searchParams.set('scope', ZOHO_OAUTH_SCOPES);
	url.searchParams.set('redirect_uri', env.redirectUri);
	url.searchParams.set('access_type', 'offline');
	url.searchParams.set('prompt', 'consent');
	url.searchParams.set('state', state);
	return url.toString();
}

export function assertOAuthState(expected: string | undefined, actual: string | null): void {
	if (!expected || !actual || expected !== actual) {
		throw new Error('Invalid OAuth state. Start the Zoho connect flow again.');
	}
}

/** Map Zoho callback `location` DC to accounts host when env default differs. */
export function accountsUrlForLocation(
	location: string | null,
	fallbackAccountsUrl: string
): string {
	if (!location) return fallbackAccountsUrl;
	const map: Record<string, string> = {
		us: 'https://accounts.zoho.com',
		eu: 'https://accounts.zoho.eu',
		in: 'https://accounts.zoho.in',
		au: 'https://accounts.zoho.com.au',
		jp: 'https://accounts.zoho.jp',
		ca: 'https://accounts.zohocloud.ca',
		sa: 'https://accounts.zoho.sa'
	};
	return map[location.toLowerCase()] ?? fallbackAccountsUrl;
}

export async function completeOAuthCallback(
	env: ZohoEnv,
	params: { code: string; location: string | null },
	fetchImpl: typeof fetch = fetch
): Promise<StoredZohoTokens> {
	const accountsUrl = accountsUrlForLocation(params.location, env.accountsUrl);
	const tokens = await exchangeAuthorizationCode({ ...env, accountsUrl }, params.code, fetchImpl);
	return {
		...tokens,
		accountsUrl
	};
}
