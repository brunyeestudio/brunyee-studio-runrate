import type { Cookies } from '@sveltejs/kit';
import type { StoredZohoTokens, TokenStore } from './auth';

export const ZOHO_TOKEN_COOKIE = 'runrate_zoho';
export const ZOHO_OAUTH_STATE_COOKIE = 'runrate_zoho_oauth_state';

/** ~400 days — Chrome's practical max-age ceiling. */
export const ZOHO_TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
export const ZOHO_OAUTH_STATE_MAX_AGE = 600;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + '='.repeat(padLength);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(secret),
  );
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function sealTokenPayload(
  payload: StoredZohoTokens,
  authSecret: string,
): Promise<string> {
  const key = await deriveAesKey(authSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext),
  );
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);
  return toBase64Url(combined);
}

export async function unsealTokenPayload(
  sealed: string,
  authSecret: string,
): Promise<StoredZohoTokens | null> {
  try {
    const combined = fromBase64Url(sealed);
    if (combined.length < 13) return null;
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await deriveAesKey(authSecret);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );
    const parsed = JSON.parse(
      new TextDecoder().decode(plaintext),
    ) as Partial<StoredZohoTokens>;
    if (
      typeof parsed.refreshToken !== 'string' ||
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }
    return {
      refreshToken: parsed.refreshToken,
      accessToken: parsed.accessToken,
      expiresAt: parsed.expiresAt,
      accountsUrl:
        typeof parsed.accountsUrl === 'string' ? parsed.accountsUrl : undefined,
      apiBaseUrl:
        typeof parsed.apiBaseUrl === 'string' ? parsed.apiBaseUrl : undefined,
    };
  } catch {
    return null;
  }
}

export interface CookieTokenStoreOptions {
  cookies: Cookies;
  authSecret: string;
  secure: boolean;
}

/**
 * Synchronous TokenStore facade over an async-sealed cookie.
 * Call `flush()` after Zoho calls so Set-Cookie reflects refreshed access tokens.
 */
export function createCookieTokenStore(
  options: CookieTokenStoreOptions,
): TokenStore & {
  hydrate: () => Promise<void>;
  flush: () => Promise<void>;
  isConnected: () => boolean;
} {
  const { cookies, authSecret, secure } = options;
  let current: StoredZohoTokens | null = null;
  let dirty = false;

  return {
    async hydrate() {
      const raw = cookies.get(ZOHO_TOKEN_COOKIE);
      current = raw ? await unsealTokenPayload(raw, authSecret) : null;
      dirty = false;
    },
    async flush() {
      if (!dirty) return;
      if (!current) {
        cookies.delete(ZOHO_TOKEN_COOKIE, { path: '/' });
      } else {
        const sealed = await sealTokenPayload(current, authSecret);
        cookies.set(ZOHO_TOKEN_COOKIE, sealed, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure,
          maxAge: ZOHO_TOKEN_COOKIE_MAX_AGE,
        });
      }
      dirty = false;
    },
    isConnected() {
      return Boolean(current?.refreshToken);
    },
    get() {
      return current;
    },
    set(tokens) {
      current = tokens;
      dirty = true;
    },
    clear() {
      current = null;
      dirty = true;
    },
  };
}

export function setOAuthStateCookie(
  cookies: Cookies,
  state: string,
  secure: boolean,
): void {
  cookies.set(ZOHO_OAUTH_STATE_COOKIE, state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: ZOHO_OAUTH_STATE_MAX_AGE,
  });
}

export function clearOAuthStateCookie(cookies: Cookies): void {
  cookies.delete(ZOHO_OAUTH_STATE_COOKIE, { path: '/' });
}

export function readOAuthStateCookie(cookies: Cookies): string | undefined {
  return cookies.get(ZOHO_OAUTH_STATE_COOKIE);
}

export function clearZohoTokenCookie(cookies: Cookies): void {
  cookies.delete(ZOHO_TOKEN_COOKIE, { path: '/' });
}

export async function writeZohoTokenCookie(
  cookies: Cookies,
  tokens: StoredZohoTokens,
  authSecret: string,
  secure: boolean,
): Promise<void> {
  const sealed = await sealTokenPayload(tokens, authSecret);
  cookies.set(ZOHO_TOKEN_COOKIE, sealed, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: ZOHO_TOKEN_COOKIE_MAX_AGE,
  });
}
