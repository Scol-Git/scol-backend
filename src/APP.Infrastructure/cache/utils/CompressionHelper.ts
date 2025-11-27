import { gzipSync, gunzipSync } from 'zlib';

/**
 * Compression Helper for Cache Values
 *
 * Provides compression/decompression utilities for Redis cache values.
 * Uses Node.js built-in zlib (gzip) for compression.
 *
 * **Note:** While LZ4 and Snappy are faster, gzip is:
 * - Built into Node.js (no dependencies)
 * - Better compression ratio
 * - Good enough for most use cases
 *
 * For high-throughput scenarios, consider adding lz4 or snappy packages.
 *
 * @module CompressionHelper
 */

export interface CompressionOptions {
  /**
   * Enable compression for cache values
   * Default: true
   */
  enabled: boolean;

  /**
   * Minimum size in bytes to trigger compression
   * Values smaller than this will not be compressed
   * Default: 1024 (1 KB)
   */
  minSizeBytes: number;
}

export class CompressionHelper {
  private readonly _enabled: boolean;
  private readonly _minSizeBytes: number;

  constructor(options: Partial<CompressionOptions> = {}) {
    this._enabled = options.enabled ?? true;
    this._minSizeBytes = options.minSizeBytes ?? 1024; // 1 KB
  }

  /**
   * Compress a string value if it meets size threshold
   *
   * @param value - String value to compress
   * @returns Compressed value with metadata prefix, or original if too small
   *
   * Format:
   * - Compressed: `__GZIP__:<base64-compressed-data>`
   * - Uncompressed: original value
   */
  compress(value: string): string {
    if (!this._enabled) {
      return value;
    }

    // Don't compress if value is too small
    if (Buffer.byteLength(value, 'utf8') < this._minSizeBytes) {
      return value;
    }

    try {
      const compressed = gzipSync(Buffer.from(value, 'utf8'));
      const base64 = compressed.toString('base64');

      // Only use compression if it actually reduces size
      if (base64.length < value.length) {
        return `__GZIP__:${base64}`;
      }

      return value;
    } catch (error) {
      // On compression error, return original value
      return value;
    }
  }

  /**
   * Decompress a value if it was compressed
   *
   * @param value - Value to decompress (may or may not be compressed)
   * @returns Decompressed value
   */
  decompress(value: string): string {
    if (!this._enabled || !value.startsWith('__GZIP__:')) {
      return value;
    }

    try {
      const base64 = value.substring(9); // Remove '__GZIP__:' prefix
      const compressed = Buffer.from(base64, 'base64');
      const decompressed = gunzipSync(compressed);
      return decompressed.toString('utf8');
    } catch (error) {
      // On decompression error, return original value
      // This handles cases where the prefix might be corrupted
      return value;
    }
  }

  /**
   * Check if a value is compressed
   *
   * @param value - Value to check
   * @returns True if value is compressed
   */
  isCompressed(value: string): boolean {
    return this._enabled && value.startsWith('__GZIP__:');
  }

  /**
   * Get compression stats for a value
   *
   * @param original - Original uncompressed value
   * @returns Compression statistics
   */
  getCompressionStats(original: string): {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    shouldCompress: boolean;
  } {
    const originalSize = Buffer.byteLength(original, 'utf8');
    const shouldCompress = this._enabled && originalSize >= this._minSizeBytes;

    if (!shouldCompress) {
      return {
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1.0,
        shouldCompress: false,
      };
    }

    try {
      const compressed = gzipSync(Buffer.from(original, 'utf8'));
      const compressedSize = compressed.length;
      const compressionRatio = compressedSize / originalSize;

      return {
        originalSize,
        compressedSize,
        compressionRatio,
        shouldCompress: compressionRatio < 1.0,
      };
    } catch (error) {
      return {
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1.0,
        shouldCompress: false,
      };
    }
  }
}

