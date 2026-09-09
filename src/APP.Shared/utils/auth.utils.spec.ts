import {
  parseJwtExpiryToMs,
  parseJwtExpiryToSeconds,
  assertValidJwtExpiry,
} from '@shared/utils/jwtExpiry.util';
import { digestRefreshToken } from '@shared/utils/tokenDigest.util';

describe('jwtExpiry.util', () => {
  it('parses 10m to 600000 ms and 600 seconds', () => {
    expect(parseJwtExpiryToMs('10m')).toBe(600_000);
    expect(parseJwtExpiryToSeconds('10m')).toBe(600);
  });

  it('validates expiry format', () => {
    expect(() => assertValidJwtExpiry('10m', 'test')).not.toThrow();
    expect(() => assertValidJwtExpiry('bad', 'test')).toThrow();
  });
});

describe('tokenDigest.util', () => {
  it('produces deterministic sha256 hex digest', () => {
    const a = digestRefreshToken('token-a');
    const b = digestRefreshToken('token-a');
    const c = digestRefreshToken('token-b');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(64);
  });
});
