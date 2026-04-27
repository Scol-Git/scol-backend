/**
 * Role Enum
 *
 * Defines all available roles in the system.
 * Roles are organization-scoped and contain collections of permissions.
 *
 * @enum Role
 */
export enum Role {
  /** Super admin - bypasses all organization restrictions */
  SUPER_ADMIN = 'SUPER_ADMIN',

  /** Admin - full access within organization */
  ADMIN = 'ADMIN',

  /** Counsellor - can manage assigned leads */
  COUNSELLOR = 'COUNSELLOR',

  /** Lead - can create and manage own applications */
  LEAD = 'LEAD',
}
