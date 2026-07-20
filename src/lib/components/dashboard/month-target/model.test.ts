import { describe, expect, it } from 'vitest';
import { deriveMonthTargetModel } from './model';

describe('deriveMonthTargetModel', () => {
  const base = {
    monthTarget: 12000,
    hourlyRate: 100,
    includeWeekends: false,
    assumedWeekdayHours: 8,
    paceHoursMode: 'even-spread' as const,
    earnedThisMonth: 6787.5,
    asOf: '2026-07-14T10:00:00.000Z',
  };

  it('marks shortfall and exposes even-spread daily earn', () => {
    const model = deriveMonthTargetModel(base);

    expect(model.hasTargetShortfall).toBe(true);
    expect(model.isOnTarget).toBe(false);
    expect(model.showAssumedHoursMode).toBe(false);
    expect(model.dailyEarnNeeded).toBeGreaterThan(0);
    expect(model.remainingDayLabel).toBe('workdays');
    expect(model.displayTarget).toBe('12000');
    expect(model.displayAssumedHours).toBe('8');
  });

  it('switches to assumed-hours daily earn and work days', () => {
    const model = deriveMonthTargetModel({
      ...base,
      paceHoursMode: 'assumed-hours',
    });

    expect(model.showAssumedHoursMode).toBe(true);
    expect(model.dailyEarnNeeded).toBe(800);
    expect(model.assumedWorkDays).toBeCloseTo((12000 - 6787.5) / 800);
  });

  it('reports on-target when earned meets the month target', () => {
    const model = deriveMonthTargetModel({
      ...base,
      monthTarget: 5000,
      earnedThisMonth: 6787.5,
    });

    expect(model.isOnTarget).toBe(true);
    expect(model.hasTargetShortfall).toBe(false);
  });

  it('uses calendar days when weekends are included', () => {
    const model = deriveMonthTargetModel({
      ...base,
      includeWeekends: true,
    });

    expect(model.remainingDayLabel).toBe('days');
  });
});
