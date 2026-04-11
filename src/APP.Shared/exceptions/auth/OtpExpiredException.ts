import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * OTP Expired Exception
 *
 * Thrown when the OTP has expired (TTL exceeded).
 * Returns 400 Bad Request (user timing error)
 */
export class OtpExpiredException extends HttpException {
  constructor() {
    super(
      {
        message: 'Your OTP has expired',
        error: { code: 'OTP_EXPIRED' },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

