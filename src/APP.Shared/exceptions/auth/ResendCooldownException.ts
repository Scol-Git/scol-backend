import { BusinessException } from '../BusinessException';

/**
 * Resend Cooldown Exception
 *
 * Thrown when attempting to resend OTP before the cooldown period has elapsed.
 */
export class ResendCooldownException extends BusinessException {
  constructor(remainingSeconds: number) {
    super(
      `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
      'RESEND_COOLDOWN_ACTIVE',
    );
  }
}

