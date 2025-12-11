import { BadRequestException } from '@nestjs/common';

/**
 * Validation Exception
 * 
 * Thrown when request validation fails (missing required fields, invalid format, etc.).
 * Extends NestJS BadRequestException for proper HTTP status code (400).
 * 
 * @example
 * throw new ValidationException('orgId query parameter is required');
 * 
 * @example
 * throw new ValidationException('Invalid input data', {
 *   email: ['Email is required', 'Email must be valid'],
 *   password: ['Password must be at least 8 characters']
 * });
 * 
 * @example
 * throw new ValidationException('Phone already exists', undefined, 'PHONE_ALREADY_EXISTS');
 */
export class ValidationException extends BadRequestException {
  /**
   * Creates a new ValidationException instance.
   * 
   * @param message - Human-readable error message
   * @param errors - Optional validation errors by field name (for field-level validation)
   * @param code - Optional error code (for single-code errors)
   */
  constructor(
    message: string,
    public readonly errors?: Record<string, string[]>,
    public readonly code?: string,
  ) {
    super(message);
  }
}

