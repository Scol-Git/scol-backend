import { RevocationRegistry } from '@infra/security/RevocationRegistry.service';

describe('RevocationRegistry', () => {
  const retentionMs = 600_000;

  function createRegistry() {
    const entries = new Map<string, number>();
    const mockDb = {
      userSessions: {
        update: jest.fn().mockResolvedValue({}),
        find: jest.fn().mockResolvedValue([]),
      },
    };
    const mockRedis = {
      getClient: () => null,
      isAvailable: false,
    };
    const mockConfig = {
      jwt: { accessTokenExpiresIn: '10m' },
    };
    const mockLogger = {
      LogInfo: jest.fn(),
      LogError: jest.fn(),
      LogWarning: jest.fn(),
      warn: jest.fn(),
    };

    const registry = Object.create(RevocationRegistry.prototype) as RevocationRegistry;
    (registry as any).entries = entries;
    (registry as any).db = mockDb;
    (registry as any).redis = mockRedis;
    (registry as any).securityConfig = mockConfig;
    (registry as any).logger = mockLogger;
    (registry as any).retentionMs = retentionMs;

    return { registry, entries };
  }

  it('rejects token issued before revocation', () => {
    const { registry, entries } = createRegistry();
    entries.set('s:session-1', 1_700_000_000);
    expect(
      registry.isRevoked({
        sessionId: 'session-1',
        userId: 'user-1',
        tokenIssuedAt: 1_699_999_999,
      }),
    ).toBe(true);
  });

  it('allows token issued after user-wide revocation', () => {
    const { registry, entries } = createRegistry();
    entries.set('u:user-1', 1_700_000_000);
    expect(
      registry.isRevoked({
        sessionId: 'session-2',
        userId: 'user-1',
        tokenIssuedAt: 1_700_000_001,
      }),
    ).toBe(false);
  });
});
