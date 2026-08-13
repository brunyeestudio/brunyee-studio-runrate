import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ANALYTICS_RANGE_PRESET,
  isAnalyticsRangePreset,
  parseAnalyticsDates,
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
