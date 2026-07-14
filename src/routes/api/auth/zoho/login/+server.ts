import { redirect } from '@sveltejs/kit';
import { readZohoEnv, ZohoEnvError } from '$lib/server/zoho/env';
import { buildAuthorizeUrl, createOAuthState } from '$lib/server/zoho/oauth';
import { setOAuthStateCookie } from '$lib/server/zoho/token-cookie';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	let env;
	try {
		env = readZohoEnv();
	} catch (error) {
		const message =
			error instanceof ZohoEnvError
				? error.message
				: error instanceof Error
					? error.message
					: 'Failed to start Zoho OAuth';
		redirect(302, `/?authError=${encodeURIComponent(message)}`);
	}

	const state = createOAuthState();
	setOAuthStateCookie(cookies, state, url.protocol === 'https:');
	redirect(302, buildAuthorizeUrl(env, state));
};
