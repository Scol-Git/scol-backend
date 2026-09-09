import { createHash } from 'crypto';

/**
 * Deterministic SHA-256 digest for high-entropy refresh tokens.
 */
export function digestRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
