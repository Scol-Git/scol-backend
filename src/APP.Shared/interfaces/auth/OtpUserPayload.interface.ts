/**
 * OTP User Payload
 *
 * Represents the pending registration information extracted from an OTP verification token.
 * This payload is attached to the request by OtpJwtGuard after token validation.
 *
 * @interface OtpUserPayload
 */
export interface OtpUserPayload {
  /**
   * Pending Registration ID
   */
  pendingId: string;

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
