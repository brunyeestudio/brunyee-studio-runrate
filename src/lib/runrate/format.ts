export function formatCurrency(amount: number, currencyCode = 'GBP', locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatHours(hours: string | null | undefined): string {
  if (!hours?.trim()) return '0:00';
  return hours.trim();
}

export function parseAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function parseHours(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const hhmm = trimmed.match(/^(\d+):([0-5]\d)$/);
  if (hhmm) {
    return Number(hhmm[1]) + Number(hhmm[2]) / 60;
  }
  const decimal = Number(trimmed.replace(/,/g, ''));
  return Number.isFinite(decimal) && decimal >= 0 ? decimal : 0;
}

export function clampProgress(current: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 0;
  if (!Number.isFinite(current) || current <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}
