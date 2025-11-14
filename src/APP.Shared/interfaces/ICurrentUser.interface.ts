/**
 * Represents the current authenticated user context.
 * Used throughout the application for authorization and multi-tenancy.
 */
export interface ICurrentUser {
  /** Unique identifier of the user */
  userId: string;

  /** Organization ID the user belongs to */
  orgId: string;

  /** User's email address */
  email: string;

  /** Array of roles/permissions the user has */
  roles: string[];

  /** Whether the user is a super admin (bypasses org restrictions) */
  isSuperAdmin: boolean;

  /** List of organization IDs the user has access to (for multi-org users) */
  allowedOrganizationsId: string[];
}


