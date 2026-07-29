import { env as privateEnv } from '$env/dynamic/private';

export interface ZohoEnv {
  clientId: string;
  clientSecret: string;
  organizationId: string;
  accountsUrl: string;
  apiBaseUrl: string;
  redirectUri: string;
  authSecret: string;
}

export class ZohoEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZohoEnvError';
  }
}

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new ZohoEnvError(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

const MIN_AUTH_SECRET_LENGTH = 32;

/** Source shape used by `readZohoEnv` — matches `$env/dynamic/private` names. */
export type ZohoEnvSource = {
  AUTH_SECRET?: string;
  ZOHO_CLIENT_ID?: string;
  ZOHO_CLIENT_SECRET?: string;
  ZOHO_ORGANIZATION_ID?: string;
  ZOHO_REDIRECT_URI?: string;
  ZOHO_ACCOUNTS_URL?: string;
  ZOHO_API_BASE_URL?: string;
};

export function readZohoEnv(env: ZohoEnvSource = privateEnv): ZohoEnv {
  const authSecret = required('AUTH_SECRET', env.AUTH_SECRET);
  if (authSecret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new ZohoEnvError(
      `AUTH_SECRET must be at least ${MIN_AUTH_SECRET_LENGTH} characters`,
    );
  }

  return {
    clientId: required('ZOHO_CLIENT_ID', env.ZOHO_CLIENT_ID),
    clientSecret: required('ZOHO_CLIENT_SECRET', env.ZOHO_CLIENT_SECRET),
    organizationId: required('ZOHO_ORGANIZATION_ID', env.ZOHO_ORGANIZATION_ID),
    redirectUri: required('ZOHO_REDIRECT_URI', env.ZOHO_REDIRECT_URI),
    authSecret,
    accountsUrl: (
      env.ZOHO_ACCOUNTS_URL?.trim() || 'https://accounts.zoho.com'
    ).replace(/\/$/, ''),
    apiBaseUrl: (
      env.ZOHO_API_BASE_URL?.trim() || 'https://www.zohoapis.com/books/v3'
    ).replace(/\/$/, ''),
  };
}
