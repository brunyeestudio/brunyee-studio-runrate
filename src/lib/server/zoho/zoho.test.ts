import { describe, expect, it } from 'vitest';
import {
	createMemoryTokenStore,
	exchangeAuthorizationCode,
	getAccessToken,
	isTokenValid,
	refreshAccessToken,
	ZohoAuthError
} from './auth';
import { buildZohoUrl } from './client';
import { readZohoEnv, ZohoEnvError } from './env';
import { mapZohoInvoice } from './invoices';
import {
	accountsUrlForLocation,
	assertOAuthState,
	buildAuthorizeUrl,
	ZOHO_OAUTH_SCOPES
} from './oauth';
import { mapZohoProjectDetail } from './projects';
import { sealTokenPayload, unsealTokenPayload } from './token-cookie';

const AUTH_SECRET = 'test-auth-secret-with-32-plus-chars!!';

function baseEnv() {
	return readZohoEnv({
		ZOHO_CLIENT_ID: 'id',
		ZOHO_CLIENT_SECRET: 'secret',
		ZOHO_ORGANIZATION_ID: 'org',
		ZOHO_REDIRECT_URI: 'http://localhost:5173/api/auth/zoho/callback',
		AUTH_SECRET,
		ZOHO_ACCOUNTS_URL: 'https://accounts.zoho.eu/',
		ZOHO_API_BASE_URL: 'https://www.zohoapis.eu/books/v3/'
	});
}

describe('zoho env', () => {
	it('reads required env vars without refresh token', () => {
		const env = baseEnv();
		expect(env.accountsUrl).toBe('https://accounts.zoho.eu');
		expect(env.apiBaseUrl).toBe('https://www.zohoapis.eu/books/v3');
		expect(env.redirectUri).toContain('/api/auth/zoho/callback');
		expect(env.authSecret).toBe(AUTH_SECRET);
	});

	it('throws when missing', () => {
		expect(() => readZohoEnv({})).toThrow(ZohoEnvError);
	});

	it('rejects short AUTH_SECRET', () => {
		expect(() =>
			readZohoEnv({
				ZOHO_CLIENT_ID: 'id',
				ZOHO_CLIENT_SECRET: 'secret',
				ZOHO_ORGANIZATION_ID: 'org',
				ZOHO_REDIRECT_URI: 'http://localhost/callback',
				AUTH_SECRET: 'too-short'
			})
		).toThrow(/AUTH_SECRET must be at least/);
	});
});

describe('zoho auth', () => {
	it('validates token expiry with skew', () => {
		expect(isTokenValid({ accessToken: 't', expiresAt: Date.now() + 120_000 })).toBe(true);
		expect(isTokenValid({ accessToken: 't', expiresAt: Date.now() + 10_000 })).toBe(false);
	});

	it('refreshes access token via fetch', async () => {
		const fetchImpl: typeof fetch = async () =>
			new Response(JSON.stringify({ access_token: 'abc', expires_in: 3600 }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});

		const token = await refreshAccessToken(
			{
				clientId: 'id',
				clientSecret: 'secret',
				accountsUrl: 'https://accounts.zoho.com'
			},
			'refresh',
			fetchImpl
		);
		expect(token.accessToken).toBe('abc');
		expect(token.expiresAt).toBeGreaterThan(Date.now());
	});

	it('exchanges authorization code for stored tokens', async () => {
		const fetchImpl: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					access_token: 'access',
					refresh_token: 'refresh',
					expires_in: 3600,
					api_domain: 'https://www.zohoapis.eu'
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);

		const tokens = await exchangeAuthorizationCode(baseEnv(), 'auth-code', fetchImpl);
		expect(tokens.accessToken).toBe('access');
		expect(tokens.refreshToken).toBe('refresh');
		expect(tokens.apiBaseUrl).toBe('https://www.zohoapis.eu/books/v3');
	});

	it('getAccessToken throws ZohoAuthError when store empty', async () => {
		await expect(
			getAccessToken(baseEnv(), { store: createMemoryTokenStore() })
		).rejects.toBeInstanceOf(ZohoAuthError);
	});

	it('getAccessToken refreshes and updates store', async () => {
		const store = createMemoryTokenStore({
			refreshToken: 'refresh',
			accessToken: 'old',
			expiresAt: Date.now() - 1_000
		});

		const fetchImpl: typeof fetch = async () =>
			new Response(JSON.stringify({ access_token: 'new', expires_in: 3600 }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});

		const access = await getAccessToken(baseEnv(), { store, fetchImpl });
		expect(access).toBe('new');
		expect(store.get()?.accessToken).toBe('new');
		expect(store.get()?.refreshToken).toBe('refresh');
	});

	it('getAccessToken reuses valid access token without fetch', async () => {
		const store = createMemoryTokenStore({
			refreshToken: 'refresh',
			accessToken: 'valid',
			expiresAt: Date.now() + 120_000
		});

		let fetched = false;
		const fetchImpl: typeof fetch = async () => {
			fetched = true;
			return new Response('{}', { status: 500 });
		};

		expect(await getAccessToken(baseEnv(), { store, fetchImpl })).toBe('valid');
		expect(fetched).toBe(false);
	});
});

describe('zoho oauth helpers', () => {
	it('builds authorize url with offline consent params', () => {
		const url = new URL(buildAuthorizeUrl(baseEnv(), 'state-123'));
		expect(url.origin + url.pathname).toBe('https://accounts.zoho.eu/oauth/v2/auth');
		expect(url.searchParams.get('response_type')).toBe('code');
		expect(url.searchParams.get('access_type')).toBe('offline');
		expect(url.searchParams.get('prompt')).toBe('consent');
		expect(url.searchParams.get('scope')).toBe(ZOHO_OAUTH_SCOPES);
		expect(url.searchParams.get('state')).toBe('state-123');
	});

	it('asserts oauth state', () => {
		expect(() => assertOAuthState('abc', 'abc')).not.toThrow();
		expect(() => assertOAuthState('abc', 'xyz')).toThrow(/Invalid OAuth state/);
		expect(() => assertOAuthState(undefined, 'abc')).toThrow(/Invalid OAuth state/);
	});

	it('maps location to accounts host', () => {
		expect(accountsUrlForLocation('eu', 'https://accounts.zoho.com')).toBe(
			'https://accounts.zoho.eu'
		);
		expect(accountsUrlForLocation(null, 'https://accounts.zoho.com')).toBe(
			'https://accounts.zoho.com'
		);
	});
});

describe('token cookie crypto', () => {
	it('seals and unseals token payload', async () => {
		const payload = {
			refreshToken: 'refresh',
			accessToken: 'access',
			expiresAt: Date.now() + 60_000,
			accountsUrl: 'https://accounts.zoho.eu',
			apiBaseUrl: 'https://www.zohoapis.eu/books/v3'
		};
		const sealed = await sealTokenPayload(payload, AUTH_SECRET);
		expect(sealed).not.toContain('refresh');
		const unsealed = await unsealTokenPayload(sealed, AUTH_SECRET);
		expect(unsealed).toEqual(payload);
	});

	it('returns null for tampered or wrong secret', async () => {
		const sealed = await sealTokenPayload(
			{
				refreshToken: 'r',
				accessToken: 'a',
				expiresAt: 1
			},
			AUTH_SECRET
		);
		expect(await unsealTokenPayload(sealed, 'wrong-secret-with-32-plus-characters')).toBeNull();
		expect(await unsealTokenPayload(sealed.slice(0, -4) + 'xxxx', AUTH_SECRET)).toBeNull();
	});
});

describe('zoho client helpers', () => {
	it('builds urls with organization_id and query', () => {
		const url = buildZohoUrl('https://www.zohoapis.com/books/v3', '/invoices', '102', {
			filter_by: 'Status.Draft',
			page: 2,
			empty: undefined
		});
		expect(url).toContain('organization_id=102');
		expect(url).toContain('filter_by=Status.Draft');
		expect(url).toContain('page=2');
		expect(url).not.toContain('empty=');
	});
});

describe('zoho mappers', () => {
	it('maps invoices', () => {
		const invoice = mapZohoInvoice({
			invoice_id: '1',
			invoice_number: 'INV-1',
			customer_name: 'Acme',
			status: 'draft',
			date: '2026-08-01',
			due_date: '2026-08-31',
			total: '100.00',
			balance: '100.00',
			schedule_time: '2026-08-01 09:00:00',
			currency_code: 'GBP'
		});
		expect(invoice.total).toBe(100);
		expect(invoice.scheduleTime).toContain('2026-08-01');
	});

	it('maps hourly projects and rejects fixed fee', () => {
		expect(
			mapZohoProjectDetail({
				project_id: '1',
				billing_type: 'based_on_project_hours',
				un_billed_amount: 250,
				un_billed_hours: '02:00'
			})?.unBilledAmount
		).toBe(250);
		expect(
			mapZohoProjectDetail({
				project_id: '2',
				billing_type: 'fixed_cost_for_project',
				un_billed_amount: 250
			})
		).toBeNull();
	});
});
