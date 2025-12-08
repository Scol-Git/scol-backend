import { BusinessException } from '../BusinessException';

/**
 * OTP Attempts Exceeded Exception
 *
 * Thrown when the user has exceeded maximum OTP verification attempts.
 */
export class OtpAttemptsExceededException extends BusinessException {
  constructor(maxAttempts: number) {
    super(
      `You have exceeded the maximum number of OTP verification attempts (${maxAttempts}). Please request a new OTP.`,
      'OTP_ATTEMPTS_EXCEEDED',
    );
  }
}

