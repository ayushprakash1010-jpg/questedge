import { Injectable, Logger } from '@nestjs/common';

/**
 * In-memory LRU-ish cache wrapper. Redis-backed swap-in lands once cache-manager
 * + cache-manager-redis-store is wired (the deps are already in package.json
 * from Phase 0). Until then this gives the rest of the codebase a stable API.
 */
@Injectable()
export class HotCacheService {
  private readonly logger = new Logger(HotCacheService.name);
  private readonly store = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly maxEntries = 5000;

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (this.store.size >= this.maxEntries) {
      // Evict the oldest insertion-order key — simple, predictable.
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Helper: cache-aside pattern. Returns cached value or runs `producer` and
   * stores the result under `key` for `ttlSeconds`.
   */
  async wrap<T>(key: string, producer: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit !== undefined) return hit;
    const value = await producer();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  stats() {
    return { size: this.store.size, maxEntries: this.maxEntries };
  }
}
