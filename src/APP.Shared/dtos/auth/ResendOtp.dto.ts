/**
 * Resend OTP DTO
 *
 * Request payload for resending OTP.
 * Phone number and user ID are extracted from the OTP JWT token in the Authorization header.
 * No body parameters required.
 */
export class ResendOtpDto {
  // No properties needed - phone and userId come from JWT token
  // This class exists for consistency and potential future expansion
}

