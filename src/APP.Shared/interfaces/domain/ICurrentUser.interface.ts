/**
 * Represents the current authenticated user context.
 * 
 * Used throughout the application for authorization and multi-tenancy.
 * Follows .NET Core's ICurrentUser pattern for user context management.
 * 
 * @interface ICurrentUser
 * @example
 * ```typescript
 * const user: ICurrentUser = {
 *   userId: '123',
 *   orgId: 'org-456',
 *   email: 'user@example.com',
 *   roles: ['Admin', 'User'],
 *   isSuperAdmin: false,
 *   allowedOrganizationsId: ['org-456']
 * };
 * ```
 */
export interface ICurrentUser {
  /** Unique identifier of the user */
  userId: string;

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

