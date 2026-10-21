export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export class SafeStorage {
  failed = false;
  private cache = new Map<string, unknown>();
  constructor(private storage: StorageLike) {}
  read(key: string): unknown {
    if (this.cache.has(key)) return this.cache.get(key);
    try {
      const raw = this.storage.getItem(key);
      const value = raw ? JSON.parse(raw) : null;
      this.cache.set(key, value);
      return value;
    } catch {
      this.failed = true;
      return null;
    }
  }
  write(key: string, value: unknown) {
    this.cache.set(key, value);
    try {
      this.storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      this.failed = true;
      return false;
    }
  }
  remove(key: string) {
    this.cache.delete(key);
    try {
      this.storage.removeItem(key);
    } catch {
      this.failed = true;
    }
  }
}
