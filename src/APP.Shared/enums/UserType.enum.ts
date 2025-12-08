/**
 * User Type Enum
 *
 * Represents the type/role category of a user in the system.
 *
 * @enum {string}
 */
export enum UserType {
  /**
   * Lead/Student - Can self-register via public registration endpoint
   */
  Lead = 'Lead',

  /**
   * System administrator - Created by other admins, has elevated privileges
   */
  Admin = 'Admin',

  /**
   * Counselor/Staff member - Created by admins, assists with lead management
   */
  Counselor = 'Counselor',

  /**
   * External agent/partner - Created by admins, limited access
   */
  Agent = 'Agent',
}

