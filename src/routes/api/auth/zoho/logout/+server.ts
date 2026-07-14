import { json } from '@sveltejs/kit';
import { clearZohoTokenCookie } from '$lib/server/zoho/token-cookie';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  clearZohoTokenCookie(cookies);
  return json({ ok: true });
};
