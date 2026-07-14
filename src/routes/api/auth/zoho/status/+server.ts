import { json } from '@sveltejs/kit';
import { readZohoEnv, ZohoEnvError } from '$lib/server/zoho/env';
import { createCookieTokenStore } from '$lib/server/zoho/token-cookie';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
  try {
    const env = readZohoEnv();
    const store = createCookieTokenStore({
      cookies,
      authSecret: env.authSecret,
      secure: url.protocol === 'https:',
    });
    await store.hydrate();
    return json({ connected: store.isConnected() });
  } catch (error) {
    if (error instanceof ZohoEnvError) {
      return json(
        { connected: false, error: error.message, code: 'ZOHO_ENV' },
        { status: 503 },
      );
    }
    return json({ connected: false });
  }
};
