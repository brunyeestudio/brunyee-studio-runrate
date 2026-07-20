import {
  forecastEndOfMonth,
  monthDayProgress,
  weekdayProgress,
  weekendProgress,
} from '$lib/runrate/dates';
import { clampProgress } from '$lib/runrate/format';
import {
  capacityOverflow,
  dailyEarnAtAssumedHours,
  hoursPerDayEvenSpread,
  requiredDailyEarn,
  workDaysAtAssumedHours,
  type CapacityOverflowResult,
} from '$lib/runrate/pace';
import {
  type PaceHoursMode,
  resolveAssumedWeekdayHours,
} from '$lib/runrate/session-config';
import { displayOptionalNumber } from './format';

type DayProgress = ReturnType<typeof monthDayProgress>;
type WeekProgress = ReturnType<typeof weekdayProgress>;
type WeekendStats = ReturnType<typeof weekendProgress>;

export interface MonthTargetModelInput {
  monthTarget: number | undefined;
  hourlyRate: number | undefined;
  includeWeekends: boolean;
  assumedWeekdayHours: number | undefined;
  paceHoursMode: PaceHoursMode;
  earnedThisMonth: number;
  asOf: string;
}

export interface MonthTargetModel {
  dayProgress: DayProgress;
  weekProgress: WeekProgress;
  weekendStats: WeekendStats;
  endOfMonthForecastAllDays: number;
  endOfMonthForecastWeekdays: number;
  progress: number;
  forecastProgressAllDays: number;
  forecastProgressWeekdays: number;
  shortfall: number;
  hasTarget: boolean;
  hasTargetShortfall: boolean;
  isOnTarget: boolean;
  remainingDaysForPace: number | null;
  evenSpreadDailyEarn: number | null;
  resolvedAssumedHours: number;
  assumedDailyEarn: number | null;
  evenSpreadHours: number | null;
  assumedWorkDays: number | null;
  hasHourlyRate: boolean;
  showAssumedHoursMode: boolean;
  dailyEarnNeeded: number | null;
  daysLeftForDisplay: number | null;
  overflow: CapacityOverflowResult | null;
  displayTarget: string;
  displayHourlyRate: string;
  displayAssumedHours: string;
  remainingDayLabel: string;
}

export function deriveMonthTargetModel(
  input: MonthTargetModelInput,
): MonthTargetModel {
  const {
    monthTarget,
    hourlyRate,
    includeWeekends,
    assumedWeekdayHours,
    paceHoursMode,
    earnedThisMonth,
    asOf,
  } = input;

  const dayProgress = monthDayProgress(asOf);
  const weekProgress = weekdayProgress(asOf);
  const weekendStats = weekendProgress(asOf);

  const endOfMonthForecastAllDays = dayProgress
    ? forecastEndOfMonth(
        earnedThisMonth,
        dayProgress.daysElapsed,
        dayProgress.daysInMonth,
      )
    : 0;
  const endOfMonthForecastWeekdays = weekProgress
    ? forecastEndOfMonth(
        earnedThisMonth,
        weekProgress.weekdaysElapsed,
        weekProgress.weekdaysInMonth,
      )
    : 0;

  const targetForProgress = monthTarget ?? 0;
  const progress = clampProgress(earnedThisMonth, targetForProgress);
  const forecastProgressAllDays = clampProgress(
    endOfMonthForecastAllDays,
    targetForProgress,
  );
  const forecastProgressWeekdays = clampProgress(
    endOfMonthForecastWeekdays,
    targetForProgress,
  );

  const shortfall =
    monthTarget !== undefined && Number.isFinite(monthTarget)
      ? Math.max(0, monthTarget - earnedThisMonth)
      : 0;
  const hasTarget =
    monthTarget !== undefined && Number.isFinite(monthTarget);
  const hasTargetShortfall = shortfall > 0;
  const isOnTarget = hasTarget && !hasTargetShortfall;

  const remainingDaysForPace = includeWeekends
    ? (dayProgress?.daysRemaining ?? null)
    : (weekProgress?.weekdaysRemaining ?? null);

  const evenSpreadDailyEarn =
    monthTarget !== undefined && remainingDaysForPace !== null
      ? requiredDailyEarn(monthTarget, earnedThisMonth, remainingDaysForPace)
      : null;

  const resolvedAssumedHours =
    resolveAssumedWeekdayHours(assumedWeekdayHours);

  const assumedDailyEarn = dailyEarnAtAssumedHours(
    hourlyRate ?? 0,
    resolvedAssumedHours,
  );

  const evenSpreadHours = hoursPerDayEvenSpread(
    evenSpreadDailyEarn,
    hourlyRate ?? 0,
  );

  const assumedWorkDays = workDaysAtAssumedHours(
    shortfall,
    hourlyRate ?? 0,
    resolvedAssumedHours,
  );

  const hasHourlyRate =
    hourlyRate !== undefined &&
    Number.isFinite(hourlyRate) &&
    hourlyRate > 0;

  const showAssumedHoursMode = paceHoursMode === 'assumed-hours';

  const dailyEarnNeeded = showAssumedHoursMode
    ? assumedDailyEarn
    : evenSpreadDailyEarn;

  const daysLeftForDisplay = showAssumedHoursMode
    ? assumedWorkDays
    : remainingDaysForPace;

  const overflow =
    monthTarget === undefined ||
    hourlyRate === undefined ||
    !Number.isFinite(hourlyRate) ||
    hourlyRate <= 0 ||
    !weekProgress ||
    !weekendStats
      ? null
      : capacityOverflow({
          target: monthTarget,
          earned: earnedThisMonth,
          hourlyRate,
          assumedWeekdayHours: resolvedAssumedHours,
          weekdaysRemaining: weekProgress.weekdaysRemaining,
          weekendDaysRemaining: weekendStats.weekendDaysRemaining,
        });

  return {
    dayProgress,
    weekProgress,
    weekendStats,
    endOfMonthForecastAllDays,
    endOfMonthForecastWeekdays,
    progress,
    forecastProgressAllDays,
    forecastProgressWeekdays,
    shortfall,
    hasTarget,
    hasTargetShortfall,
    isOnTarget,
    remainingDaysForPace,
    evenSpreadDailyEarn,
    resolvedAssumedHours,
    assumedDailyEarn,
    evenSpreadHours,
    assumedWorkDays,
    hasHourlyRate,
    showAssumedHoursMode,
    dailyEarnNeeded,
    daysLeftForDisplay,
    overflow,
    displayTarget: displayOptionalNumber(monthTarget),
    displayHourlyRate: displayOptionalNumber(hourlyRate),
    displayAssumedHours: displayOptionalNumber(
      assumedWeekdayHours,
      String(resolvedAssumedHours),
    ),
    remainingDayLabel: includeWeekends ? 'days' : 'workdays',
  };
}
