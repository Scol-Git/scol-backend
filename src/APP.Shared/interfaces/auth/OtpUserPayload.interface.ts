/**
 * OTP User Payload
 *
 * Represents the user information extracted from an OTP verification token.
 * This payload is attached to the request by OtpJwtGuard after token validation.
 *
 * @interface OtpUserPayload
 */
export interface OtpUserPayload {
  /**
   * User ID
   */
  userId: string;

  /**
   * Phone number associated with OTP
   */
  phone: string;

  /**
   * Purpose of the OTP token
   * @example "phone_verify"
   */
  purpose: string;
}
