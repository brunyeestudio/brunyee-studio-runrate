import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ANALYTICS_RANGE_PRESET,
  deriveMetrics,
  hasHourlyRate,
  isAnalyticsRangePreset,
  parseAnalyticsDates,
  percentChange,
  previousPeriod,
  resolveAnalyticsRange,
} from './analytics';

describe('analytics range', () => {
  it('resolves rolling windows ending today inclusive', () => {
    expect(DEFAULT_ANALYTICS_RANGE_PRESET).toBe('1m');
    expect(resolveAnalyticsRange('7d', '2026-08-13')).toEqual({
      from: '2026-08-07',
      to: '2026-08-13',
    });
    expect(resolveAnalyticsRange('1m', '2026-08-13')).toEqual({
      from: '2026-07-15',
      to: '2026-08-13',
    });
    expect(resolveAnalyticsRange('3m', '2026-08-13')).toEqual({
      from: '2026-05-16',
      to: '2026-08-13',
    });
  });

  it('computes an equal-length previous period immediately before from', () => {
    expect(
      previousPeriod({ from: '2026-07-15', to: '2026-08-13' }),
    ).toEqual({ from: '2026-06-15', to: '2026-07-14' });
    expect(previousPeriod({ from: '2026-08-07', to: '2026-08-13' })).toEqual({
      from: '2026-07-31',
      to: '2026-08-06',
    });
  });

  it('parses valid inclusive ISO dates and rejects invalid', () => {
    expect(parseAnalyticsDates('2026-07-15', '2026-08-13')).toEqual({
      from: '2026-07-15',
      to: '2026-08-13',
    });
    expect(parseAnalyticsDates('2026-08-13', '2026-07-15')).toBeNull();
    expect(parseAnalyticsDates('nope', '2026-08-13')).toBeNull();
    expect(parseAnalyticsDates(null, '2026-08-13')).toBeNull();
    expect(isAnalyticsRangePreset('1m')).toBe(true);
    expect(isAnalyticsRangePreset('2m')).toBe(false);
  });
});

describe('deriveMetrics', () => {
  it('returns blanks without a positive hourly rate', () => {
    expect(hasHourlyRate(undefined)).toBe(false);
    expect(hasHourlyRate(0)).toBe(false);
    expect(deriveMetrics(10, 1000, undefined)).toEqual({
      soldHours: null,
      hoursVariance: null,
      moneyVariance: null,
      effectiveRate: null,
      status: null,
    });
  });

  it('flags overshoot when spent hours exceed sold hours by more than 0.5h', () => {
    const result = deriveMetrics(12, 1000, 100);
    expect(result.soldHours).toBe(10);
    expect(result.hoursVariance).toBe(2);
    expect(result.moneyVariance).toBe(-200);
    expect(result.effectiveRate).toBeCloseTo(1000 / 12);
    expect(result.status).toBe('overshoot');
  });

  it('flags headroom when invoices more than cover time', () => {
    const result = deriveMetrics(8, 1000, 100);
    expect(result.soldHours).toBe(10);
    expect(result.hoursVariance).toBe(-2);
    expect(result.moneyVariance).toBe(200);
    expect(result.status).toBe('headroom');
  });

  it('treats ±0.5h as on rate', () => {
    expect(deriveMetrics(10.5, 1000, 100).status).toBe('on-rate');
    expect(deriveMetrics(9.5, 1000, 100).status).toBe('on-rate');
    expect(deriveMetrics(10, 1000, 100).status).toBe('on-rate');
  });

  it('handles no time logged and no invoices', () => {
    expect(deriveMetrics(0, 1000, 100).status).toBe('no-time');
    expect(deriveMetrics(0, 1000, 100).soldHours).toBe(10);
    expect(deriveMetrics(0, 1000, 100).effectiveRate).toBeNull();
    expect(deriveMetrics(6, 0, 100).status).toBe('no-invoices');
    expect(deriveMetrics(6, 0, 100).effectiveRate).toBe(0);
  });
});

describe('percentChange', () => {
  it('returns null when previous is zero', () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(12, 10)).toBeCloseTo(0.2);
  });
});
