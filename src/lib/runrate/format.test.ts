import { describe, expect, it } from 'vitest';
import { clampProgress, formatCurrency, formatHours, parseAmount } from './format';

describe('format', () => {
	it('parses amounts and formats currency', () => {
		expect(parseAmount('1,234.50')).toBe(1234.5);
		expect(parseAmount(10)).toBe(10);
		expect(parseAmount(undefined)).toBe(0);
		expect(formatCurrency(1234.5, 'GBP')).toContain('1,234.50');
		expect(formatHours('05:30')).toBe('05:30');
		expect(formatHours(null)).toBe('0:00');
	});

	it('clamps progress percentage', () => {
		expect(clampProgress(50, 100)).toBe(50);
		expect(clampProgress(150, 100)).toBe(100);
		expect(clampProgress(10, 0)).toBe(0);
	});
});
