import { describe, expect, it } from 'vitest';
import {
  MissingExchangeRateError,
  hasMultipleCurrencies,
  latestBookedRates,
  sumMoney,
  toBaseAmount,
} from './currency';
import type { FxContext } from './types';

const gbpFx: FxContext = {
  baseCurrencyCode: 'GBP',
  rates: { GBP: 1, EUR: 0.85 },
};

describe('currency', () => {
  it('takes the most recent booked rate per currency', () => {
    expect(
      latestBookedRates([
        { currencyCode: 'USD', date: '2026-06-01', exchangeRate: 0.7 },
        { currencyCode: 'USD', date: '2026-07-01', exchangeRate: 0.8 },
        { currencyCode: 'EUR', date: '2026-07-01', exchangeRate: null },
      ]),
    ).toEqual({ USD: 0.8 });
  });

  it('prefers a per-item booked rate over the current rate', () => {
    const items = [
      { amount: 100, currency: 'EUR', rate: 0.9 },
      { amount: 100, currency: 'EUR', rate: null },
    ];
    const result = sumMoney(
      items,
      (item) => item.amount,
      (item) => item.currency,
      gbpFx,
      (item) => item.rate,
    );
    expect(result.amount).toBe(175);
  });

  it('converts foreign amounts into base currency', () => {
    expect(toBaseAmount(100, 'GBP', 'GBP', gbpFx.rates)).toBe(100);
    expect(toBaseAmount(100, 'EUR', 'GBP', gbpFx.rates)).toBe(85);
  });

  it('throws when an exchange rate is missing', () => {
    expect(() => toBaseAmount(50, 'USD', 'GBP', gbpFx.rates)).toThrow(MissingExchangeRateError);
  });

  it('sums mixed currencies with conversion and per-currency breakdown', () => {
    const result = sumMoney(
      [
        { amount: 1000, currencyCode: 'GBP' },
        { amount: 200, currencyCode: 'EUR' },
        { amount: 100, currencyCode: 'EUR' },
      ],
      (item) => item.amount,
      (item) => item.currencyCode,
      gbpFx,
    );
    expect(result.amount).toBe(1255);
    expect(result.byCurrency).toEqual([
      { currencyCode: 'GBP', amount: 1000, convertedAmount: 1000, count: 1 },
      { currencyCode: 'EUR', amount: 300, convertedAmount: 255, count: 2 },
    ]);
  });

  it('detects multi-currency totals', () => {
    expect(hasMultipleCurrencies([], 'GBP')).toBe(false);
    expect(
      hasMultipleCurrencies(
        [{ currencyCode: 'GBP', amount: 10, convertedAmount: 10, count: 1 }],
        'GBP',
      ),
    ).toBe(false);
    expect(
      hasMultipleCurrencies(
        [{ currencyCode: 'EUR', amount: 10, convertedAmount: 8.5, count: 1 }],
        'GBP',
      ),
    ).toBe(true);
    expect(
      hasMultipleCurrencies(
        [
          { currencyCode: 'GBP', amount: 10, convertedAmount: 10, count: 1 },
          { currencyCode: 'EUR', amount: 5, convertedAmount: 4.25, count: 1 },
        ],
        'GBP',
      ),
    ).toBe(true);
  });
});
