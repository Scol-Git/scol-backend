import { createHash } from 'crypto';
import type { Request } from 'express';

/**
 * Short, stable hash of the request User-Agent for rate-limit bucket keys.
 * Missing/empty UA maps to the same "unknown" bucket.
 */
export function getClientUaHash(req: Request): string {
  const userAgentHeader = req.headers['user-agent'];
  const userAgent =
    typeof userAgentHeader === 'string'
      ? userAgentHeader
      : userAgentHeader?.[0];

  const value = userAgent?.trim() ? userAgent.trim() : 'unknown';
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}
