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
  SUPER_ADMIN = 'super_admin',
  
  /** Admin - full access within organization */
  ADMIN = 'admin',
  
  /** Manager - can manage projects and todos */
  MANAGER = 'manager',
  
  /** Member - can create and manage own todos */
  MEMBER = 'member',
  
  /** Viewer - read-only access */
  VIEWER = 'viewer',
}

