import { BusinessException } from '../BusinessException';

/**
 * OTP Expired Exception
 *
 * Thrown when the OTP has expired (TTL exceeded).
 */
export class OtpExpiredException extends BusinessException {
  constructor() {
    super('Your OTP has expired. Please request a new OTP.', 'OTP_EXPIRED');
  }
}

