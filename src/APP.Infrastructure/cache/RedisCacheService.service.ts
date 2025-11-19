import { Injectable, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { ICacheService } from '@shared/interfaces/infrastructure';
import { ILogger } from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';

/**
 * Redis Cache Service Implementation
 * 
 * Provides distributed caching using Redis.
 * Follows .NET Core's IDistributedCache pattern.
 * 
 * @class RedisCacheService
 * @implements {ICacheService}
 */
@Injectable()
export class RedisCacheService implements ICacheService, OnModuleInit, OnModuleDestroy {
  private _client: Redis | null = null;
  private _isConnected = false;

  constructor(
    private readonly _config: ConfigService,
    @Inject(ILogger) private readonly _logger: ILoggerInterface,
  ) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this._config.get<string>('REDIS_URL');
    
    if (!redisUrl) {
      this._logger.LogWarning('REDIS_URL not configured, Redis cache will not be available');
      return;
    }

    try {
      this._client = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this._client.on('connect', () => {
        this._logger.LogInfo('Redis client connecting');
      });

      this._client.on('ready', () => {
        this._isConnected = true;
        this._logger.LogInfo('Redis client ready');
      });

      this._client.on('error', (error) => {
        this._isConnected = false;
        this._logger.LogError('Redis client error', error);
      });

      this._client.on('close', () => {
        this._isConnected = false;
        this._logger.LogInfo('Redis client connection closed');
      });

      await this._client.connect();
    } catch (error) {
      this._logger.LogError('Failed to connect to Redis', error);
      this._isConnected = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this._client) {
      await this._client.quit();
      this._client = null;
      this._isConnected = false;
    }
  }

  private _ensureConnected(): void {
    if (!this._client || !this._isConnected) {
      throw new Error('Redis cache is not available');
    }
  }

  private _serialize<T>(value: T): string {
    return JSON.stringify(value);
  }

  private _deserialize<T>(value: string): T {
    return JSON.parse(value) as T;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      this._ensureConnected();
      const value = await this._client!.get(key);
      
      if (value === null) {
        return null;
      }

      return this._deserialize<T>(value);
    } catch (error) {
      this._logger.LogError(`Cache get error for key: ${key}`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      this._ensureConnected();
      const serialized = this._serialize(value);
      
      if (ttlSeconds) {
        await this._client!.setex(key, ttlSeconds, serialized);
      } else {
        await this._client!.set(key, serialized);
      }
    } catch (error) {
      this._logger.LogError(`Cache set error for key: ${key}`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      this._ensureConnected();
      await this._client!.del(key);
    } catch (error) {
      this._logger.LogError(`Cache remove error for key: ${key}`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      this._ensureConnected();
      const result = await this._client!.exists(key);
      return result === 1;
    } catch (error) {
      this._logger.LogError(`Cache exists error for key: ${key}`, error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      this._ensureConnected();
      await this._client!.flushdb();
      this._logger.LogWarning('Redis cache cleared');
    } catch (error) {
      this._logger.LogError('Cache clear error', error);
      throw error;
    }
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      this._ensureConnected();
      
      if (keys.length === 0) {
        return [];
      }

      const values = await this._client!.mget(...keys);
      return values.map((value) => {
        if (value === null) {
          return null;
        }
        try {
          return this._deserialize<T>(value);
        } catch {
          return null;
        }
      });
    } catch (error) {
      this._logger.LogError(`Cache getMany error for keys: ${keys.join(', ')}`, error);
      return keys.map(() => null);
    }
  }

  async setMany<T>(entries: Array<{ key: string; value: T }>, ttlSeconds?: number): Promise<void> {
    try {
      this._ensureConnected();
      
      if (entries.length === 0) {
        return;
      }

      const pipeline = this._client!.pipeline();
      
      for (const { key, value } of entries) {
        const serialized = this._serialize(value);
        if (ttlSeconds) {
          pipeline.setex(key, ttlSeconds, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }

      await pipeline.exec();
    } catch (error) {
      this._logger.LogError('Cache setMany error', error);
      throw error;
    }
  }

  /**
   * Check if Redis is connected and available
   */
  get isConnected(): boolean {
    return this._isConnected;
  }
}



