import { json } from '@sveltejs/kit';
import { parseAnalyticsDates } from '$lib/runrate';
import { FrankfurterError } from '$lib/server/fx/frankfurter';
import { ZohoAuthError } from '$lib/server/zoho/auth';
import { ZohoApiError } from '$lib/server/zoho/client';
import { buildZohoAnalytics } from '$lib/server/zoho/analytics';
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

    const bounds = parseAnalyticsDates(
      url.searchParams.get('from'),
      url.searchParams.get('to'),
    );
    if (!bounds) {
      return json(
        {
          error: 'from and to must be yyyy-MM-dd with from ≤ to',
          code: 'ANALYTICS_RANGE',
        },
        { status: 400 },
      );
    }
    const snapshot = await buildZohoAnalytics(bounds.from, bounds.to, {
      env,
      store,
    });
    await store.flush();
    return json(snapshot);
  } catch (error) {
    if (error instanceof ZohoEnvError) {
      return json({ error: error.message, code: 'ZOHO_ENV' }, { status: 503 });
    }
    if (error instanceof ZohoAuthError) {
      return json({ error: error.message, code: 'ZOHO_AUTH' }, { status: 401 });
    }
    if (error instanceof FrankfurterError) {
      return json({ error: error.message, code: 'FX_ERROR' }, { status: 502 });
    }
    if (error instanceof ZohoApiError) {
      if (error.status === 401) {
        return json(
          {
            error:
              'Zoho authorization is missing required permissions. Reconnect Zoho Books to continue.',
            code: 'ZOHO_AUTH',
          },
          { status: 401 },
        );
      }
      return json(
        { error: error.message, code: 'ZOHO_API', zohoCode: error.code },
        {
          status:
            error.status >= 400 && error.status < 600 ? error.status : 502,
        },
      );
    }
    const message =
      error instanceof Error ? error.message : 'Unknown analytics error';
    return json({ error: message, code: 'ANALYTICS_ERROR' }, { status: 500 });
  }
};
