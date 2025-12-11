/**
 * Redis Infrastructure Barrel Export
 *
 * Provides centralized exports for all Redis-related services and modules.
 */

// Core Redis connection
export { RedisModule } from './RedisModule.module';
export { RedisConnectionService } from './RedisConnectionService.service';

// Cache
export { CacheModule } from './cache/CacheModule.module';
export { CacheService } from './cache/CacheService.service';
export { CacheKeyBuilder } from './cache/utils/CacheKeyBuilder';
export { CompressionHelper } from './cache/utils/CompressionHelper';
export type { CacheKeyConfig } from './cache/utils/CacheKeyBuilder';
export type { CompressionOptions } from './cache/utils/CompressionHelper';

// Rate Limiting
export { RateLimitingModule } from './rate-limiting/RateLimitingModule.module';
export { RateLimitingStorage } from './rate-limiting/RateLimitingStorage.service';
export { RateLimitKeyBuilder } from './rate-limiting/utils/RateLimitKeyBuilder';
export type { RateLimitKeyConfig } from './rate-limiting/utils/RateLimitKeyBuilder';

