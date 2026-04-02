import { ValidationException } from '../ValidationException';

/**
 * Phone Already Exists Exception
 *
 * Thrown when attempting to register with a phone number that's already in use.
 */
export class PhoneAlreadyExistsException extends ValidationException {
  constructor(phone: string) {
    super(
      `Phone number already registered.`,
      undefined,
      'PHONE_ALREADY_EXISTS',
    );
  }
}

