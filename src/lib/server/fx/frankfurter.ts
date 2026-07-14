import type { FxContext } from '$lib/runrate/types';

/** Display / conversion base for Runrate totals (Brunyee Books org home currency). */
export const DEFAULT_BASE_CURRENCY = 'GBP';

const FRANKFURTER_LATEST_URL = 'https://api.frankfurter.app/latest';

interface FrankfurterLatestResponse {
	amount?: number;
	base?: string;
	date?: string;
	rates?: Record<string, number>;
}

export class FrankfurterError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'FrankfurterError';
	}
}

/**
 * Build FX context from Frankfurter (ECB) latest rates.
 * Frankfurter returns foreign units per 1 base; we store multipliers as
 * `base = foreign * rate` (i.e. the inverse).
 */
export function mapFrankfurterRates(
	baseCurrencyCode: string,
	neededCurrencyCodes: string[],
	frankfurterRates: Record<string, number>
): FxContext {
	const base = baseCurrencyCode.trim().toUpperCase();
	const rates: Record<string, number> = { [base]: 1 };

	for (const rawCode of neededCurrencyCodes) {
		const code = rawCode.trim().toUpperCase();
		if (!code || code === base) continue;
		const foreignPerBase = frankfurterRates[code];
		if (
			typeof foreignPerBase !== 'number' ||
			!Number.isFinite(foreignPerBase) ||
			foreignPerBase <= 0
		) {
			throw new FrankfurterError(
				`No exchange rate available for ${code} (base ${base}). Frankfurter/ECB may not support this currency.`
			);
		}
		rates[code] = 1 / foreignPerBase;
	}

	return { baseCurrencyCode: base, rates };
}

export async function fetchFrankfurterFx(
	baseCurrencyCode: string,
	currencyCodes: Iterable<string>,
	fetchImpl: typeof fetch = fetch
): Promise<FxContext> {
	const base = baseCurrencyCode.trim().toUpperCase() || DEFAULT_BASE_CURRENCY;
	const needed = [
		...new Set(
			[...currencyCodes]
				.map((code) => code.trim().toUpperCase())
				.filter((code) => code.length > 0 && code !== base)
		)
	];

	if (needed.length === 0) {
		return { baseCurrencyCode: base, rates: { [base]: 1 } };
	}

	const url = new URL(FRANKFURTER_LATEST_URL);
	url.searchParams.set('from', base);
	url.searchParams.set('to', needed.join(','));

	let response: Response;
	try {
		response = await fetchImpl(url.toString(), {
			headers: { Accept: 'application/json' }
		});
	} catch (error) {
		const detail = error instanceof Error ? error.message : 'network error';
		throw new FrankfurterError(`Failed to reach Frankfurter FX API: ${detail}`);
	}

	if (!response.ok) {
		throw new FrankfurterError(
			`Frankfurter FX API failed (${response.status}) for base ${base}.`
		);
	}

	const data = (await response.json()) as FrankfurterLatestResponse;
	return mapFrankfurterRates(base, needed, data.rates ?? {});
}

/** Collect distinct currency codes from invoice/project-like records. */
export function collectCurrencyCodes(
	records: Array<{ currencyCode: string }>
): string[] {
	return [...new Set(records.map((record) => record.currencyCode).filter(Boolean))];
}
