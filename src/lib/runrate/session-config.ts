import { DEFAULT_ASSUMED_WEEKDAY_HOURS } from './pace';

const STORAGE_KEY = 'runrate:temp-config';

/** How the “To hit target” hours panel is expressed. */
export type PaceHoursMode = 'even-spread' | 'assumed-hours';

export const DEFAULT_PACE_HOURS_MODE: PaceHoursMode = 'even-spread';

export interface TempSessionConfig {
  monthTarget?: number;
  hourlyRate?: number;
  includeWeekends?: boolean;
  assumedWeekdayHours?: number;
  paceHoursMode?: PaceHoursMode;
}

function readPaceHoursMode(value: unknown): PaceHoursMode | undefined {
  if (value === 'even-spread' || value === 'assumed-hours') return value;
  return undefined;
}

function canUseSessionStorage(): boolean {
  return typeof sessionStorage !== 'undefined';
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

export function readTempConfig(): TempSessionConfig {
  if (!canUseSessionStorage()) return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TempSessionConfig;
    const monthTarget = readFiniteNumber(parsed.monthTarget);
    const hourlyRate = readFiniteNumber(parsed.hourlyRate);
    const assumedWeekdayHours = readFiniteNumber(parsed.assumedWeekdayHours);
    const includeWeekends =
      typeof parsed.includeWeekends === 'boolean'
        ? parsed.includeWeekends
        : undefined;
    const paceHoursMode = readPaceHoursMode(parsed.paceHoursMode);

    const next: TempSessionConfig = {};
    if (monthTarget !== undefined) next.monthTarget = monthTarget;
    if (hourlyRate !== undefined) next.hourlyRate = hourlyRate;
    if (includeWeekends !== undefined) next.includeWeekends = includeWeekends;
    if (assumedWeekdayHours !== undefined) {
      next.assumedWeekdayHours = assumedWeekdayHours;
    }
    if (paceHoursMode !== undefined) next.paceHoursMode = paceHoursMode;
    return next;
  } catch {
    return {};
  }
}

export function writeTempConfig(config: TempSessionConfig): void {
  if (!canUseSessionStorage()) return;
  const next: TempSessionConfig = {};
  if (
    typeof config.monthTarget === 'number' &&
    Number.isFinite(config.monthTarget)
  ) {
    next.monthTarget = config.monthTarget;
  }
  if (
    typeof config.hourlyRate === 'number' &&
    Number.isFinite(config.hourlyRate)
  ) {
    next.hourlyRate = config.hourlyRate;
  }
  if (typeof config.includeWeekends === 'boolean') {
    next.includeWeekends = config.includeWeekends;
  }
  if (
    typeof config.assumedWeekdayHours === 'number' &&
    Number.isFinite(config.assumedWeekdayHours)
  ) {
    next.assumedWeekdayHours = config.assumedWeekdayHours;
  }
  if (
    config.paceHoursMode === 'even-spread' ||
    config.paceHoursMode === 'assumed-hours'
  ) {
    next.paceHoursMode = config.paceHoursMode;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearTempConfig(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Resolve assumed weekday hours with the product default when unset. */
export function resolveAssumedWeekdayHours(value: number | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  return DEFAULT_ASSUMED_WEEKDAY_HOURS;
}

/** Resolve pace hours display mode with the product default when unset. */
export function resolvePaceHoursMode(
  value: PaceHoursMode | undefined,
): PaceHoursMode {
  return value === 'assumed-hours' ? 'assumed-hours' : DEFAULT_PACE_HOURS_MODE;
}

export { STORAGE_KEY as TEMP_CONFIG_STORAGE_KEY };
