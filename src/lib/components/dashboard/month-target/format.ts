export function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatHoursPerDay(hours: number): string {
  return `${hours.toLocaleString('en-GB', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}h/day`;
}

export function formatWorkDays(days: number): string {
  const label = days === 1 ? 'work day' : 'work days';
  return `${days.toLocaleString('en-GB', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })} ${label}`;
}

export function displayOptionalNumber(
  value: number | undefined,
  fallback?: string,
): string {
  if (value === undefined || Number.isNaN(value)) {
    return fallback ?? '';
  }
  return String(value);
}
