import { afterEach, describe, expect, it } from 'vitest';
import {
  TEMP_CONFIG_STORAGE_KEY,
  clearTempConfig,
  readTempConfig,
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

  it('reads and writes temporary month target', () => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });

    expect(readTempConfig()).toEqual({});
    writeTempConfig({ monthTarget: 12000 });
    expect(readTempConfig()).toEqual({ monthTarget: 12000 });
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
});
