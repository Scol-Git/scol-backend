/**
 * Interface for password hashing service.
 *
 * Provides abstraction for password hashing and verification.
 * Follows .NET Core's IPasswordHasher pattern.
 *
 * @interface IPasswordHasher
 */
export interface IPasswordHasher {
  /**
   * Hash a password.
   *
   * @param password - Plain text password
   * @returns Hashed password
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Hash a password (alias for hashPassword).
   *
   * @param password - Plain text password
   * @returns Hashed password
   */
  hash(password: string): Promise<string>;

  /**
   * Verify a password against a hash.
   *
   * @param password - Plain text password
   * @param hash - Hashed password
   * @returns True if password matches hash
   */
  verifyPassword(password: string, hash: string): Promise<boolean>;

  /**
   * Verify a password against a hash (alias for verifyPassword).
   *
   * @param password - Plain text password
   * @param hash - Hashed password
   * @returns True if password matches hash
   */
  verify(password: string, hash: string): Promise<boolean>;
}
