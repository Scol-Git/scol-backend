import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Invalid OTP Exception
 *
 * Thrown when the provided OTP doesn't match the stored OTP.
 * Returns 400 Bad Request (user input error)
 */
export class InvalidOtpException extends HttpException {
  constructor() {
    super(
      {
        message: 'The OTP you entered is incorrect. Please check and try again.',
        error: { code: 'INVALID_OTP' },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

