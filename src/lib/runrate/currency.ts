import type { CurrencyAmount, FxContext, MoneyTotal } from './types';

export class MissingExchangeRateError extends Error {
  currencyCode: string;

  constructor(currencyCode: string) {
    super(`No exchange rate configured for currency ${currencyCode}`);
    this.name = 'MissingExchangeRateError';
    this.currencyCode = currencyCode;
  }
}

/** Convert a native-currency amount into the org base currency. */
export function toBaseAmount(
  amount: number,
  currencyCode: string,
  baseCurrencyCode: string,
  rates: Record<string, number>,
): number {
  if (currencyCode === baseCurrencyCode) return amount;
  const rate = rates[currencyCode];
  if (rate === undefined || !Number.isFinite(rate)) {
    throw new MissingExchangeRateError(currencyCode);
  }
  return amount * rate;
}

function sortByCurrency(entries: CurrencyAmount[], baseCurrencyCode: string): CurrencyAmount[] {
  return [...entries].sort((a, b) => {
    if (a.currencyCode === baseCurrencyCode) return -1;
    if (b.currencyCode === baseCurrencyCode) return 1;
    return b.convertedAmount - a.convertedAmount;
  });
}

/**
 * Sum amounts in native currencies and convert into base.
 * `rates` maps foreign currency → multiplier (`base = foreign * rate`).
 * `getBookedRate` supplies a per-item rate (e.g. the invoice's own rate) that
 * wins over `fx.rates` when it is a positive number.
 */
export function sumMoney<T>(
  items: T[],
  getAmount: (item: T) => number,
  getCurrency: (item: T) => string,
  fx: FxContext,
  getBookedRate: (item: T) => number | null | undefined = () => undefined,
): MoneyTotal {
  const byCode = new Map<string, { amount: number; convertedAmount: number; count: number }>();

  for (const item of items) {
    const currencyCode = getCurrency(item);
    const amount = getAmount(item);
    const bookedRate = getBookedRate(item);
    const convertedAmount =
      currencyCode !== fx.baseCurrencyCode && bookedRate && bookedRate > 0
        ? amount * bookedRate
        : toBaseAmount(amount, currencyCode, fx.baseCurrencyCode, fx.rates);
    const existing = byCode.get(currencyCode);
    if (existing) {
      existing.amount += amount;
      existing.convertedAmount += convertedAmount;
      existing.count += 1;
    } else {
      byCode.set(currencyCode, { amount, convertedAmount, count: 1 });
    }
  }

  const byCurrency = sortByCurrency(
    [...byCode.entries()].map(([currencyCode, value]) => ({
      currencyCode,
      amount: value.amount,
      convertedAmount: value.convertedAmount,
      count: value.count,
    })),
    fx.baseCurrencyCode,
  );

  return {
    amount: byCurrency.reduce((sum, entry) => sum + entry.convertedAmount, 0),
    byCurrency,
  };
}

/** Most recent booked rate per currency — a fallback when no current rate is available. */
export function latestBookedRates(
  records: Array<{ currencyCode: string; date: string; exchangeRate?: number | null }>,
): Record<string, number> {
  const latest = new Map<string, { date: string; rate: number }>();
  for (const { currencyCode, date, exchangeRate } of records) {
    if (!exchangeRate || exchangeRate <= 0) continue;
    const existing = latest.get(currencyCode);
    if (!existing || date > existing.date) latest.set(currencyCode, { date, rate: exchangeRate });
  }
  return Object.fromEntries([...latest].map(([code, { rate }]) => [code, rate]));
}

export function emptyMoneyTotal(): MoneyTotal {
  return { amount: 0, byCurrency: [] };
}

/** True when more than one currency, or any non-base currency is present. */
export function hasMultipleCurrencies(
  byCurrency: CurrencyAmount[],
  baseCurrencyCode: string,
): boolean {
  if (byCurrency.length > 1) return true;
  return byCurrency.some((entry) => entry.currencyCode !== baseCurrencyCode);
}
