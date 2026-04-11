import { BusinessException } from '../BusinessException';

/**
 * Account Not Verified Exception
 *
 * Thrown when attempting to login with an account that hasn't verified phone/email yet.
 */
export class AccountNotVerifiedException extends BusinessException {
  constructor() {
    super(
      'Account verification is required',
      'ACCOUNT_NOT_VERIFIED',
    );
  }
}

