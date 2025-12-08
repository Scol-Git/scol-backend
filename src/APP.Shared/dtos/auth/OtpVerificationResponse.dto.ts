import { AutoMap } from '@automapper/classes';

/**
 * Register Lead Response DTO
 *
 * Response after successful registration or OTP resend.
 * Contains a short-lived OTP verification token.
 */
export class RegisterLeadResponseDto {
  /**
   * OTP verification JWT token (short-lived, aud=otp, purpose=phone_verify)
   * Use this token in Authorization header for /verify-otp and /resend-otp endpoints
   */
  @AutoMap()
  otpAccessToken!: string;

  /**
   * Token expiration time in seconds
   * @example 300
   */
  @AutoMap()
  expiresIn!: number;

  /**
   * Success message
   * @example "OTP sent successfully. Please verify your phone."
   */
  @AutoMap()
  message!: string;

  /**
   * OTP code (only in development mode for testing)
   * NEVER present in production
   * @example "123456"
   */
  @AutoMap()
  devOtp?: string;
}
