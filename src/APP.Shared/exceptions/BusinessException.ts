/**
 * Base class for all business-related exceptions.
 * Extends the standard Error class with an additional error code property.
 *
 * This class should be extended by specific business exception types.
 *
 * @example
 * export class TodoNotFoundException extends BusinessException {
 *   constructor(todoId: string) {
 *     super(`Todo with ID ${todoId} not found`, 'TODO_NOT_FOUND');
 *   }
 * }
 */
export abstract class BusinessException extends Error {
  /**
   * Creates a new BusinessException instance.
   *
   * @param message - Human-readable error message
   * @param code - Machine-readable error code (e.g., 'TODO_NOT_FOUND', 'INVALID_STATUS')
   */
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
