import { redirect } from '@sveltejs/kit';
import { readZohoEnv, ZohoEnvError, type ZohoEnv } from '$lib/server/zoho/env';
import { assertOAuthState, completeOAuthCallback } from '$lib/server/zoho/oauth';
import {
	clearOAuthStateCookie,
	readOAuthStateCookie,
	writeZohoTokenCookie
} from '$lib/server/zoho/token-cookie';
import type { RequestHandler } from './$types';

function failRedirect(cookies: Parameters<RequestHandler>[0]['cookies'], message: string): never {
	clearOAuthStateCookie(cookies);
	redirect(302, `/?authError=${encodeURIComponent(message)}`);
}

export const GET: RequestHandler = async ({ cookies, url }) => {
	let env: ZohoEnv;
	try {
		env = readZohoEnv();
	} catch (error) {
		failRedirect(
			cookies,
			error instanceof ZohoEnvError ? error.message : 'Zoho env not configured'
		);
	}

	const oauthError = url.searchParams.get('error');
	if (oauthError) {
		failRedirect(cookies, url.searchParams.get('error_description') || oauthError);
	}

	const code = url.searchParams.get('code');
	if (!code) {
		failRedirect(cookies, 'Missing authorization code from Zoho.');
	}

	try {
		assertOAuthState(readOAuthStateCookie(cookies), url.searchParams.get('state'));
		const tokens = await completeOAuthCallback(env, {
			code,
			location: url.searchParams.get('location')
		});
		await writeZohoTokenCookie(cookies, tokens, env.authSecret, url.protocol === 'https:');
		clearOAuthStateCookie(cookies);
	} catch (error) {
		failRedirect(
			cookies,
			error instanceof Error ? error.message : 'Zoho OAuth callback failed'
		);
	}

	redirect(302, '/');
};
