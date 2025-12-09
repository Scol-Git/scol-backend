import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Inject,
  Optional,
} from '@nestjs/common';
import Redis from 'ioredis';
import type { IInfrastructureConfig } from '@shared/interfaces/config/IInfrastructureConfig.interface';
import {
  ILogger,
  IInfrastructureConfig as IInfrastructureConfigToken,
} from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';

/**
 * Redis Connection Service
 *
 * Provides a shared Redis connection that can be reused by multiple services
 * (CacheModule, RateLimitingModule, etc.) to avoid creating duplicate connections.
 *
 * Uses connection pooling internally - each service can request a client with
 * its own configuration (keyPrefix, etc.) while sharing the underlying connection pool.
 *
 * @class RedisConnectionService
 */
@Injectable()
export class RedisConnectionService implements OnModuleInit, OnModuleDestroy {
  private _defaultClient: Redis | null = null;
  private _isConnected = false;
  private readonly _redisUrl: string | undefined;

  constructor(
    @Inject(IInfrastructureConfigToken)
    private readonly _config: IInfrastructureConfig,
    @Inject(ILogger) @Optional() private readonly _logger?: ILoggerInterface,
  ) {
    this._redisUrl = this._config.cache.redisUrl;
  }

  async onModuleInit(): Promise<void> {
    if (!this._redisUrl) {
      if (this._logger) {
        this._logger.LogWarning(
          'REDIS_URL not configured, Redis connection service will not be available. App will continue with fail-open behavior.',
        );
      }
      return;
    }

    try {
      // Create default connection (can be reused by services that don't need special config)
      this._defaultClient = new Redis(this._redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this._defaultClient.on('connect', () => {
        if (this._logger) {
          this._logger.LogInfo('Redis connection service connecting');
        }
      });

      this._defaultClient.on('ready', () => {
        this._isConnected = true;
        if (this._logger) {
          this._logger.LogInfo('Redis connection service ready');
        }
      });

      this._defaultClient.on('error', (error) => {
        this._isConnected = false;
        if (this._logger) {
          this._logger.LogError('Redis connection service error', error);
        }
      });

      this._defaultClient.on('close', () => {
        this._isConnected = false;
        if (this._logger) {
          this._logger.LogInfo('Redis connection service connection closed');
        }
      });

      await this._defaultClient.connect();
    } catch (error) {
      if (this._logger) {
        this._logger.LogError(
          'Failed to connect to Redis connection service. App will continue with fail-open behavior.',
          error,
        );
      }
      this._isConnected = false;
      // Do not throw - allow app to start even if Redis is down
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this._defaultClient) {
      await this._defaultClient.quit();
      this._defaultClient = null;
      this._isConnected = false;
    }
  }

  /**
   * Get the shared Redis client
   * All services should use this single connection for efficiency
   */
  getClient(): Redis | null {
    return this._defaultClient;
  }

  /**
   * @deprecated Use getClient() instead
   * Kept for backward compatibility
   */
  getDefaultClient(): Redis | null {
    return this._defaultClient;
  }

  /**
   * Check if Redis is available and connected
   */
  get isAvailable(): boolean {
    return (
      this._redisUrl !== undefined &&
      this._isConnected &&
      this._defaultClient !== null
    );
  }

  /**
   * Get Redis URL
   */
  get redisUrl(): string | undefined {
    return this._redisUrl;
  }
}
