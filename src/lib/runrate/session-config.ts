const STORAGE_KEY = 'runrate:temp-config';

export interface TempSessionConfig {
  monthTarget?: number;
}

function canUseSessionStorage(): boolean {
  return typeof sessionStorage !== 'undefined';
}

export function readTempConfig(): TempSessionConfig {
  if (!canUseSessionStorage()) return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TempSessionConfig;
    const monthTarget =
      typeof parsed.monthTarget === 'number' &&
      Number.isFinite(parsed.monthTarget)
        ? parsed.monthTarget
        : undefined;
    return { monthTarget };
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
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearTempConfig(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export { STORAGE_KEY as TEMP_CONFIG_STORAGE_KEY };
