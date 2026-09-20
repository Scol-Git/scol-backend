/**
 * In-process revocation denylist with Redis durability for restarts.
 */
export interface IRevocationRegistry {
  /**
   * Returns true when the token must be rejected (revoked after token iat).
   */
  isRevoked(params: {
    sessionId?: string;
    userId: string;
    tokenIssuedAt: number;
  }): boolean;

  /**
   * Revoke a single session immediately.
   */
  revokeSession(sessionId: string, userId: string, reason?: string): Promise<void>;

  /**
   * Revoke all sessions for a user immediately.
   */
  revokeAllUserSessions(userId: string, reason?: string): Promise<void>;

  /**
   * Warm the in-memory registry from durable storage (called at startup).
   */
  warmUp(): Promise<void>;
}
