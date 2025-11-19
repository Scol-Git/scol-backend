/**
 * User Status Enum
 * 
 * Represents the status of a user account.
 */
export enum UserStatus {
  /** User account is active and can log in */
  Active = 'Active',
  
  /** User account is inactive (cannot log in) */
  Inactive = 'Inactive',
  
  /** User account is locked (temporarily cannot log in) */
  Locked = 'Locked',
}



