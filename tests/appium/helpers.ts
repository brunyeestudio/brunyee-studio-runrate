import { browser } from '@wdio/globals';

/**
 * Resolve the Runrate preview URL for the current Appium session.
 * Android emulator → 10.0.2.2 (host loopback); iOS Simulator → localhost.
 */
export function getAppBaseUrl(): string {
	if (process.env.APPIUM_BASE_URL) {
		return process.env.APPIUM_BASE_URL.replace(/\/$/, '');
	}

	const port = process.env.APPIUM_APP_PORT ?? '4173';
	const platformName = String(
		(browser.capabilities as WebdriverIO.Capabilities).platformName ?? ''
	).toLowerCase();

	if (platformName === 'android') {
		return `http://10.0.2.2:${port}`;
	}

	return `http://localhost:${port}`;
}
