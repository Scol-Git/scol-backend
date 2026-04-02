import { UnauthorizedException } from '@nestjs/common';

/**
 * Invalid Token Exception
 * 
 * Thrown when JWT token is invalid, expired, or malformed.
 * Extends NestJS UnauthorizedException for proper HTTP status code (401).
 * 
 * @example
 * throw new InvalidTokenException();
 * 
 * @example
 * throw new InvalidTokenException('Refresh token has expired');
 */
export class InvalidTokenException extends UnauthorizedException {
  /**
   * Creates a new InvalidTokenException instance.
   * 
   * @param message - Optional custom error message
   */
  constructor(message: string = 'Token is invalid or expired') {
    super(message);
  }
}

