import { BusinessException } from './BusinessException';

/**
 * Represents a domain logic violation or business rule failure.
 * Use this for errors related to domain invariants, business validations, and constraints.
 *
 * @example
 * // Invalid status transition
 * throw new DomainException(
 *   'Cannot transition from DONE to NEW status',
 *   'INVALID_STATUS_TRANSITION'
 * );
 *
 * @example
 * // Business rule violation
 * throw new DomainException(
 *   'Cannot assign more than 5 todos to a single user',
 *   'TODO_LIMIT_EXCEEDED'
 * );
 */
export class DomainException extends BusinessException {
  /**
   * Creates a new DomainException instance.
   *
   * @param message - Human-readable error message describing the domain violation
   * @param code - Machine-readable error code (defaults to 'DOMAIN_ERROR')
   */
  constructor(message: string, code: string = 'DOMAIN_ERROR') {
    super(message, code);
  }
}
