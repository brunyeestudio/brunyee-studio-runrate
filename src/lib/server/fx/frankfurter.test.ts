import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BASE_CURRENCY,
  FrankfurterError,
  collectCurrencyCodes,
  fetchFrankfurterFx,
  mapFrankfurterRates,
} from './frankfurter';

describe('frankfurter fx', () => {
  it('inverts Frankfurter rates into base = foreign * rate multipliers', () => {
    const fx = mapFrankfurterRates('GBP', ['EUR', 'USD'], {
      EUR: 1.17,
      USD: 1.27,
    });
    expect(fx.baseCurrencyCode).toBe('GBP');
    expect(fx.rates.GBP).toBe(1);
    expect(fx.rates.EUR).toBeCloseTo(1 / 1.17);
    expect(fx.rates.USD).toBeCloseTo(1 / 1.27);
  });

  it('throws when a needed currency is missing from the response', () => {
    expect(() =>
      mapFrankfurterRates('GBP', ['EUR', 'AED'], { EUR: 1.17 }),
    ).toThrow(FrankfurterError);
  });

  it('collects distinct currency codes', () => {
    expect(
      collectCurrencyCodes([
        { currencyCode: 'GBP' },
        { currencyCode: 'EUR' },
        { currencyCode: 'GBP' },
      ]),
    ).toEqual(['GBP', 'EUR']);
  });

  it('fetches and maps latest rates via Frankfurter', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      expect(url).toContain('api.frankfurter.app/latest');
      expect(url).toContain('from=GBP');
      expect(url).toContain('to=EUR');
      return new Response(
        JSON.stringify({
          amount: 1,
          base: 'GBP',
          date: '2026-07-14',
          rates: { EUR: 1.175 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const fx = await fetchFrankfurterFx(
      DEFAULT_BASE_CURRENCY,
      ['GBP', 'EUR'],
      fetchImpl,
    );
    expect(fx.baseCurrencyCode).toBe('GBP');
    expect(fx.rates.EUR).toBeCloseTo(1 / 1.175);
  });

  it('skips the network when only the base currency is present', async () => {
    let fetched = false;
    const fetchImpl: typeof fetch = async () => {
      fetched = true;
      return new Response('{}', { status: 500 });
    };
    const fx = await fetchFrankfurterFx('GBP', ['GBP'], fetchImpl);
    expect(fetched).toBe(false);
    expect(fx.rates).toEqual({ GBP: 1 });
  });
});
