import { BusinessException } from '../BusinessException';

/**
 * Invalid OTP Exception
 *
 * Thrown when the provided OTP doesn't match the stored OTP.
 */
export class InvalidOtpException extends BusinessException {
  constructor() {
    super(
      'The OTP you entered is incorrect. Please check and try again.',
      'INVALID_OTP',
    );
  }
}

