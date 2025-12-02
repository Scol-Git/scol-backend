/**
 * Interface for Firebase Authentication Service.
 * 
 * Provides abstraction for Firebase Admin SDK operations.
 * 
 * @interface IFirebaseService
 */
export interface IFirebaseService {
  /**
   * Verify a Firebase ID token and return decoded user information.
   * 
   * @param idToken - Firebase ID token from the client
   * @returns Decoded user information (uid, email, name, picture, phone_number)
   * @throws Error if token is invalid or expired
   */
  verifyIdToken(idToken: string): Promise<FirebaseDecodedToken>;
}

/**
 * Decoded Firebase ID Token
 */
export interface FirebaseDecodedToken {
  /** Firebase User UID */
  uid: string;
  /** User email */
  email?: string;
  /** User display name */
  name?: string;
  /** User profile picture URL */
  picture?: string;
  /** User phone number (if verified) */
  phone_number?: string;
  /** Whether email is verified */
  email_verified?: boolean;
  /** Whether phone is verified */
  phone_verified?: boolean;
}

