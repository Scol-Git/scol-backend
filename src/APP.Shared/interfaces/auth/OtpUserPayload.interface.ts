/**
 * OTP User Payload
 *
 * Represents the pending registration or password reset information extracted from an OTP verification token.
 */
export interface OtpUserPayload {
  pendingId?: string;
  userId?: string;
  phone: string;
  purpose: 'phone_verify' | 'password_reset';
}
