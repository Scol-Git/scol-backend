import { DomainException } from '../DomainException';

/**
 * Phone Already Exists Exception
 *
 * Thrown when attempting to register with a phone number that's already in use.
 */
export class PhoneAlreadyExistsException extends DomainException {
  constructor(phone: string) {
    super(
      `Phone number ${phone} is already registered. Please use a different phone number or login.`,
      'PHONE_ALREADY_EXISTS',
    );
  }
}

