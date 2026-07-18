import { getAppBaseUrl } from './helpers.js';

describe('Runrate mobile browser smoke', () => {
  it('shows the Runrate heading on the dashboard', async () => {
    await browser.url(`${getAppBaseUrl()}/`);

    const heading = $('h1');
    await heading.waitForDisplayed({ timeout: 15_000 });
    await expect(heading).toHaveText('Runrate');
  });
});
