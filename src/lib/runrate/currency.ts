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
	rates: Record<string, number>
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
 */
export function sumMoney<T>(
	items: T[],
	getAmount: (item: T) => number,
	getCurrency: (item: T) => string,
	fx: FxContext
): MoneyTotal {
	const byCode = new Map<string, { amount: number; convertedAmount: number; count: number }>();

	for (const item of items) {
		const currencyCode = getCurrency(item);
		const amount = getAmount(item);
		const convertedAmount = toBaseAmount(amount, currencyCode, fx.baseCurrencyCode, fx.rates);
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
			count: value.count
		})),
		fx.baseCurrencyCode
	);

	return {
		amount: byCurrency.reduce((sum, entry) => sum + entry.convertedAmount, 0),
		byCurrency
	};
}

export function emptyMoneyTotal(): MoneyTotal {
	return { amount: 0, byCurrency: [] };
}

/** True when more than one currency, or any non-base currency is present. */
export function hasMultipleCurrencies(
	byCurrency: CurrencyAmount[],
	baseCurrencyCode: string
): boolean {
	if (byCurrency.length > 1) return true;
	return byCurrency.some((entry) => entry.currencyCode !== baseCurrencyCode);
}
