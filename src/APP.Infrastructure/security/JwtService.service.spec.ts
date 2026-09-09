import { JwtService } from '@infra/security/JwtService.service';
import type { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import { InvalidTokenException } from '@shared/exceptions/auth/InvalidTokenException';

describe('JwtService', () => {
  const config: ISecurityConfig = {
    jwt: {
      accessSecret: 'a'.repeat(32),
      refreshSecret: 'b'.repeat(32),
      otpSecret: 'c'.repeat(32),
      issuer: 'test-issuer',
      accessTokenExpiresIn: '10m',
      refreshTokenExpiresIn: '7d',
      sessionAbsoluteMax: '30d',
    },
    password: { bcryptSaltRounds: 12, minLength: 8, blockCommon: true },
    otp: {
      length: 6,
      ttlSeconds: 300,
      maxAttempts: 3,
      resendCooldownSeconds: 60,
      maxResendPerSession: 2,
      dailyLimitPerPhone: 5,
      dailyLimitPerIp: 20,
      redisPrefix: 'auth:',
    },
  };

  let service: JwtService;

  beforeEach(() => {
    service = new JwtService(config);
  });

  it('issues access token with sid and jti', () => {
    const token = service.generateAccessToken({
      sub: 'user-1',
      sid: 'session-1',
      jti: 'jti-1',
      orgId: '',
      email: 'a@b.com',
      roles: ['Lead'],
      permissions: [],
      isSuperAdmin: false,
    });
    const payload = service.verifyToken(token, 'access');
    expect(payload.sub).toBe('user-1');
    expect(payload.sid).toBe('session-1');
    expect(payload.jti).toBe('jti-1');
    expect(payload.iss).toBe('test-issuer');
    expect(payload.aud).toBe('access');
    expect(payload.exp! - payload.iat!).toBe(600);
  });

  it('rejects refresh token used as access token', () => {
    const refresh = service.generateRefreshToken({
      sub: 'user-1',
      sid: 'session-1',
    });
    expect(() => service.verifyToken(refresh, 'access')).toThrow(
      InvalidTokenException,
    );
  });

  it('issues OTP token without password hash in payload', () => {
    const token = service.generateOtpToken({
      sessionId: 'pending-1',
      phone: '+8801',
      purpose: 'phone_verify',
    });
    const decoded = service.verifyOtpToken(token);
    expect(decoded.pendingId).toBe('pending-1');
    expect((decoded as any).newPasswordHash).toBeUndefined();
  });
});
