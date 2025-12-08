import { BusinessException } from '../BusinessException';

/**
 * Email Already Exists Exception
 *
 * Thrown when attempting to register with an email that's already in use.
 */
export class EmailAlreadyExistsException extends BusinessException {
  constructor(email: string) {
    super(
      `Email ${email} is already registered. Please use a different email or login.`,
      'EMAIL_ALREADY_EXISTS',
    );
  }
}

