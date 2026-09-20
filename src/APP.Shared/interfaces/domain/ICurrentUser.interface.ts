/**
 * Represents the current authenticated user context.
 */
export interface ICurrentUser {
  /** Unique identifier of the user */
  userId: string;

  /** Active session identifier (UserSessions.id) */
  sessionId: string;

  /** Organization ID the user belongs to */
  orgId: string;

  /** User's email address */
  email: string;

  /** Array of roles the user has */
  roles: string[];

  /** Array of permissions the user has (from roles) */
  permissions?: string[];

  /** Whether the user is a super admin (bypasses org restrictions) */
  isSuperAdmin: boolean;

  /** List of organization IDs the user has access to (for multi-org users) */
  allowedOrganizationsId: string[];
}
