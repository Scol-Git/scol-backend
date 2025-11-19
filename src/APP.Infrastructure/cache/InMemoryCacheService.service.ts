import { Injectable } from '@nestjs/common';
import type { ICacheService } from '@shared/interfaces/infrastructure';

interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

/**
 * In-Memory Cache Service Implementation
 *
 * Provides in-memory caching for development and testing.
 * Not suitable for production with multiple instances.
 *
 * @class InMemoryCacheService
 * @implements {ICacheService}
 */
@Injectable()
export class InMemoryCacheService implements ICacheService {
  private readonly _cache = new Map<string, CacheEntry<any>>();
  private readonly _cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this._cleanupInterval = setInterval(() => {
      this._cleanupExpired();
    }, 60000);
  }

  private _cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this._cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this._cache.delete(key);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this._cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this._cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    };

    this._cache.set(key, entry);
  }

  async remove(key: string): Promise<void> {
    this._cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const entry = this._cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this._cache.delete(key);
      return false;
    }

    return true;
  }

  async clear(): Promise<void> {
    this._cache.clear();
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((key) => this.get<T>(key)));
  }

  async setMany<T>(
    entries: Array<{ key: string; value: T }>,
    ttlSeconds?: number,
  ): Promise<void> {
    await Promise.all(
      entries.map(({ key, value }) => this.set(key, value, ttlSeconds)),
    );
  }

  /**
   * Cleanup interval on destroy
   */
  onModuleDestroy(): void {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }
    this._cache.clear();
  }
}
