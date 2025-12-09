import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Resend OTP DTO
 *
 * Request payload for resending OTP.
 * Phone number and user ID are extracted from the OTP JWT token in the Authorization header.
 * No body parameters required.
 */
export class ResendOtpDto {
  @ApiPropertyOptional({
    description:
      'No body required; phone/user derived from OTP access token in Authorization header',
  })
  _?: unknown;
}

