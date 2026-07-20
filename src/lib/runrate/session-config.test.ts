import { afterEach, describe, expect, it } from 'vitest';
import {
  TEMP_CONFIG_STORAGE_KEY,
  clearTempConfig,
  readTempConfig,
  resolveAssumedWeekdayHours,
  resolvePaceHoursMode,
  writeTempConfig,
} from './session-config';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe('session-config', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'sessionStorage');
  });

  it('reads and writes temporary month target and pace settings', () => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });

    expect(readTempConfig()).toEqual({});
    writeTempConfig({
      monthTarget: 12000,
      hourlyRate: 85,
      includeWeekends: true,
      assumedWeekdayHours: 6,
      paceHoursMode: 'assumed-hours',
    });
    expect(readTempConfig()).toEqual({
      monthTarget: 12000,
      hourlyRate: 85,
      includeWeekends: true,
      assumedWeekdayHours: 6,
      paceHoursMode: 'assumed-hours',
    });
    expect(storage.getItem(TEMP_CONFIG_STORAGE_KEY)).toContain('12000');
    clearTempConfig();
    expect(readTempConfig()).toEqual({});
  });

  it('ignores invalid payloads', () => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });
    storage.setItem(TEMP_CONFIG_STORAGE_KEY, '{bad');
    expect(readTempConfig()).toEqual({});
  });

  it('resolves assumed weekday hours with a default', () => {
    expect(resolveAssumedWeekdayHours(undefined)).toBe(8);
    expect(resolveAssumedWeekdayHours(6)).toBe(6);
    expect(resolveAssumedWeekdayHours(0)).toBe(8);
  });

  it('resolves pace hours mode with a default', () => {
    expect(resolvePaceHoursMode(undefined)).toBe('even-spread');
    expect(resolvePaceHoursMode('assumed-hours')).toBe('assumed-hours');
    expect(resolvePaceHoursMode('even-spread')).toBe('even-spread');
  });
});
