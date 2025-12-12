/**
 * OTP User Payload
 *
 * Represents the pending registration or password reset information extracted from an OTP verification token.
 * This payload is attached to the request by OtpJwtGuard after token validation.
 *
 * @interface OtpUserPayload
 */
export interface OtpUserPayload {
  /**
   * Pending Registration ID (for phone_verify purpose)
   */
  pendingId?: string;

  /**
   * User ID (for password_reset purpose)
   */
  userId?: string;

  /**
   * Phone number associated with OTP
   */
  phone: string;

  /**
   * Purpose of the OTP token
   * @example "phone_verify" | "password_reset"
   */
  purpose: 'phone_verify' | 'password_reset';
}
