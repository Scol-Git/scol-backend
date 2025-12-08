import { BusinessException } from '../BusinessException';

/**
 * Account Not Verified Exception
 *
 * Thrown when attempting to login with an account that hasn't verified phone/email yet.
 */
export class AccountNotVerifiedException extends BusinessException {
  constructor() {
    super(
      'Your account is not verified. Please verify your phone number first.',
      'ACCOUNT_NOT_VERIFIED',
    );
  }
}

