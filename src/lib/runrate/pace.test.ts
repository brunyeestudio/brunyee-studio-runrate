import { describe, expect, it } from 'vitest';
import {
  capacityOverflow,
  dailyEarnAtAssumedHours,
  hoursPerDayEvenSpread,
  requiredDailyEarn,
  workDaysAtAssumedHours,
} from './pace';

describe('pace', () => {
  it('computes required daily earn to hit target', () => {
    expect(requiredDailyEarn(12000, 6000, 12)).toBe(500);
    expect(requiredDailyEarn(12000, 12000, 12)).toBe(0);
    expect(requiredDailyEarn(12000, 13000, 12)).toBe(0);
    expect(requiredDailyEarn(12000, 6000, 0)).toBeNull();
    expect(requiredDailyEarn(Number.NaN, 6000, 12)).toBeNull();
  });

  it('computes even-spread hours per day from rate', () => {
    expect(hoursPerDayEvenSpread(500, 100)).toBe(5);
    expect(hoursPerDayEvenSpread(0, 100)).toBe(0);
    expect(hoursPerDayEvenSpread(500, 0)).toBeNull();
    expect(hoursPerDayEvenSpread(null, 100)).toBeNull();
  });

  it('computes daily earn at assumed hours and rate', () => {
    expect(dailyEarnAtAssumedHours(50, 4)).toBe(200);
    expect(dailyEarnAtAssumedHours(100, 8)).toBe(800);
    expect(dailyEarnAtAssumedHours(0, 8)).toBeNull();
    expect(dailyEarnAtAssumedHours(100, 0)).toBeNull();
  });

  it('computes work days needed at assumed hours per day', () => {
    // £900 shortfall at £50/h and 4h/day → 4.5 work days
    expect(workDaysAtAssumedHours(900, 50, 4)).toBe(4.5);
    expect(workDaysAtAssumedHours(0, 50, 4)).toBe(0);
    expect(workDaysAtAssumedHours(900, 0, 4)).toBeNull();
    expect(workDaysAtAssumedHours(900, 50, 0)).toBeNull();
    expect(workDaysAtAssumedHours(-1, 50, 4)).toBeNull();
  });

  it('computes capacity overflow when weekdays alone are enough', () => {
    // 13 weekdays × 8h × £100 = £10,400 capacity; shortfall £6,000 → enough
    const result = capacityOverflow({
      target: 12000,
      earned: 6000,
      hourlyRate: 100,
      assumedWeekdayHours: 8,
      weekdaysRemaining: 13,
      weekendDaysRemaining: 4,
    });
    expect(result).toEqual({
      weekdayCapacity: 10400,
      shortfall: 0,
      weekendDaysNeeded: 0,
      weekdaysAloneEnough: true,
      exceedsRemainingWeekends: false,
    });
  });

  it('computes weekend days needed when weekday capacity is insufficient', () => {
    // Remaining earn £10,000; weekday capacity 5 × 8 × £50 = £2,000 → shortfall £8,000
    // Earn per day £400 → ceil(8000/400) = 20 weekend days needed
    const result = capacityOverflow({
      target: 12000,
      earned: 2000,
      hourlyRate: 50,
      assumedWeekdayHours: 8,
      weekdaysRemaining: 5,
      weekendDaysRemaining: 4,
    });
    expect(result).toEqual({
      weekdayCapacity: 2000,
      shortfall: 8000,
      weekendDaysNeeded: 20,
      weekdaysAloneEnough: false,
      exceedsRemainingWeekends: true,
    });
  });

  it('returns null for invalid capacity overflow inputs', () => {
    expect(
      capacityOverflow({
        target: 12000,
        earned: 2000,
        hourlyRate: 0,
        assumedWeekdayHours: 8,
        weekdaysRemaining: 5,
        weekendDaysRemaining: 4,
      }),
    ).toBeNull();
  });
});
