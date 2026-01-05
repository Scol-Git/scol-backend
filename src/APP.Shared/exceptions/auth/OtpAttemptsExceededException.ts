import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * OTP Attempts Exceeded Exception
 *
 * Thrown when the user has exceeded maximum OTP verification attempts.
 * Returns 400 Bad Request (user behavior error)
 */
export class OtpAttemptsExceededException extends HttpException {
  constructor(maxAttempts: number) {
    super(
      {
        message: `You have exceeded the maximum number of OTP verification attempts (${maxAttempts}). Please request a new OTP.`,
        error: { code: 'OTP_ATTEMPTS_EXCEEDED' },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

