/** Default assumed billable hours per weekday for capacity-overflow math. */
export const DEFAULT_ASSUMED_WEEKDAY_HOURS = 8;

/**
 * Amount that must be earned each remaining day to hit the target.
 * Returns null when remaining days are unavailable; 0 when already at/above target.
 */
export function requiredDailyEarn(
  target: number,
  earned: number,
  remainingDays: number,
): number | null {
  if (!Number.isFinite(target) || !Number.isFinite(earned)) return null;
  if (!Number.isFinite(remainingDays) || remainingDays <= 0) return null;
  const shortfall = Math.max(0, target - earned);
  if (shortfall === 0) return 0;
  return shortfall / remainingDays;
}

/** Hours per day if the required daily earn is spread evenly at the given rate. */
export function hoursPerDayEvenSpread(
  requiredDaily: number | null,
  hourlyRate: number,
): number | null {
  if (requiredDaily === null) return null;
  if (!Number.isFinite(requiredDaily)) return null;
  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) return null;
  return requiredDaily / hourlyRate;
}

/** Daily earn when billing at a fixed assumed hours/day and hourly rate. */
export function dailyEarnAtAssumedHours(
  hourlyRate: number,
  assumedHours: number,
): number | null {
  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) return null;
  if (!Number.isFinite(assumedHours) || assumedHours <= 0) return null;
  return hourlyRate * assumedHours;
}

/**
 * Work days needed to close the shortfall when billing at `assumedHours` per day.
 * Example: £900 shortfall at £50/h and 4h/day → 4.5 work days.
 */
export function workDaysAtAssumedHours(
  shortfall: number,
  hourlyRate: number,
  assumedHours: number,
): number | null {
  if (!Number.isFinite(shortfall) || shortfall < 0) return null;
  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) return null;
  if (!Number.isFinite(assumedHours) || assumedHours <= 0) return null;
  if (shortfall === 0) return 0;
  return shortfall / (hourlyRate * assumedHours);
}

export interface CapacityOverflowInput {
  target: number;
  earned: number;
  hourlyRate: number;
  assumedWeekdayHours: number;
  weekdaysRemaining: number;
  weekendDaysRemaining: number;
}

export interface CapacityOverflowResult {
  weekdayCapacity: number;
  shortfall: number;
  weekendDaysNeeded: number;
  weekdaysAloneEnough: boolean;
  /** True when weekend days needed exceed weekend days remaining. */
  exceedsRemainingWeekends: boolean;
}

/**
 * Capacity overflow: assume weekdays are worked at `assumedWeekdayHours`,
 * then compute how many weekend days are still needed at that same hours/day.
 */
export function capacityOverflow(
  input: CapacityOverflowInput,
): CapacityOverflowResult | null {
  const {
    target,
    earned,
    hourlyRate,
    assumedWeekdayHours,
    weekdaysRemaining,
    weekendDaysRemaining,
  } = input;

  if (!Number.isFinite(target) || !Number.isFinite(earned)) return null;
  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) return null;
  if (!Number.isFinite(assumedWeekdayHours) || assumedWeekdayHours <= 0) {
    return null;
  }
  if (!Number.isFinite(weekdaysRemaining) || weekdaysRemaining < 0) return null;
  if (!Number.isFinite(weekendDaysRemaining) || weekendDaysRemaining < 0) {
    return null;
  }

  const weekdayCapacity = weekdaysRemaining * assumedWeekdayHours * hourlyRate;
  const remainingEarn = Math.max(0, target - earned);
  const shortfall = Math.max(0, remainingEarn - weekdayCapacity);
  const earnPerDay = assumedWeekdayHours * hourlyRate;
  const weekendDaysNeeded =
    shortfall === 0 ? 0 : Math.ceil(shortfall / earnPerDay);

  return {
    weekdayCapacity,
    shortfall,
    weekendDaysNeeded,
    weekdaysAloneEnough: shortfall === 0,
    exceedsRemainingWeekends: weekendDaysNeeded > weekendDaysRemaining,
  };
}
