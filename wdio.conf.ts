/**
 * Appium + WebdriverIO mobile browser suite.
 *
 * Prerequisites:
 * - Android: ANDROID_HOME set, Pixel 10 (or ANDROID_DEVICE_NAME) emulator running,
 *   Chrome, UiAutomator2 driver; adb is resolved from $ANDROID_HOME/platform-tools/adb.
 *   Chromedriver for the emulator Chrome version is auto-downloaded via Appium.
 * - iOS: Xcode Simulator booted, XCUITest driver (`npx appium driver install xcuitest`)
 * - App already serving on port 4173 (e.g. `pnpm build && pnpm preview` in another terminal)
 *
 * Env overrides: ANDROID_HOME, ANDROID_DEVICE_NAME, IOS_DEVICE_NAME, IOS_PLATFORM_VERSION,
 * APPIUM_BASE_URL, APPIUM_APP_PORT
 */
import { existsSync } from 'node:fs';
import { createConnection } from 'node:net';
import path from 'node:path';

const PREVIEW_PORT = Number(process.env.APPIUM_APP_PORT ?? 4173);

function getRequestedSuite(): 'android' | 'ios' | null {
  const suiteFlagIndex = process.argv.indexOf('--suite');
  if (suiteFlagIndex === -1) return null;
  const value = process.argv[suiteFlagIndex + 1];
  if (value === 'android' || value === 'ios') return value;
  return null;
}

/** Resolve adb from $ANDROID_HOME/platform-tools and put SDK tools on PATH. */
function resolveAndroidSdk(): { androidHome: string; adbPath: string } {
  const androidHome = process.env.ANDROID_HOME;
  if (!androidHome) {
    throw new Error(
      'ANDROID_HOME must be set to your Android SDK path (e.g. ~/Library/Android/sdk)',
    );
  }

  const adbPath = path.join(androidHome, 'platform-tools', 'adb');
  if (!existsSync(adbPath)) {
    throw new Error(
      `adb not found at $ANDROID_HOME/platform-tools/adb (${adbPath})`,
    );
  }

  const platformTools = path.join(androidHome, 'platform-tools');
  const emulatorDir = path.join(androidHome, 'emulator');
  process.env.ANDROID_SDK_ROOT ??= androidHome;
  process.env.PATH = [platformTools, emulatorDir, process.env.PATH ?? ''].join(
    path.delimiter,
  );

  return { androidHome, adbPath };
}

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

const requestedSuite = getRequestedSuite();

const androidSdk = requestedSuite !== 'ios' ? resolveAndroidSdk() : null;

const androidCapability: WebdriverIO.Capabilities = {
  platformName: 'Android',
  browserName: 'Chrome',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': process.env.ANDROID_DEVICE_NAME ?? 'Pixel_10',
  'appium:noReset': true,
  ...(androidSdk ? { 'appium:adbExecPath': androidSdk.adbPath } : {}),
};

const iosCapability: WebdriverIO.Capabilities = {
  platformName: 'iOS',
  browserName: 'Safari',
  'appium:automationName': 'XCUITest',
  'appium:deviceName': process.env.IOS_DEVICE_NAME ?? 'iPhone 16',
  'appium:noReset': true,
  ...(process.env.IOS_PLATFORM_VERSION
    ? { 'appium:platformVersion': process.env.IOS_PLATFORM_VERSION }
    : {}),
};

const capabilities: WebdriverIO.Capabilities[] = [];
if (requestedSuite !== 'ios') capabilities.push(androidCapability);
if (requestedSuite !== 'android') capabilities.push(iosCapability);

export const config: WebdriverIO.Config = {
  runner: 'local',
  tsConfigPath: './tsconfig.wdio.json',

  specs: ['./tests/appium/**/*.e2e.ts'],
  suites: {
    android: ['./tests/appium/**/*.e2e.ts'],
    ios: ['./tests/appium/**/*.e2e.ts'],
  },

  maxInstances: 1,
  capabilities,

  logLevel: 'info',
  bail: 0,
  waitforTimeout: 10_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 3,

  services: [
    [
      'appium',
      {
        args: {
          address: '127.0.0.1',
          port: 4723,
          // Match Chromedriver to the emulator's Chrome major version (e.g. 149).
          allowInsecure: 'uiautomator2:chromedriver_autodownload',
        },
        command: 'appium',
      },
    ],
  ],

  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 120_000,
  },

  async onPrepare() {
    if (await isPortOpen(PREVIEW_PORT)) return;

    throw new Error(
      `Nothing is listening on port ${PREVIEW_PORT}. Start the app first, e.g. \`pnpm build && pnpm preview\` (or \`pnpm dev\` on 5173 with APPIUM_APP_PORT=5173).`,
    );
  },
};
