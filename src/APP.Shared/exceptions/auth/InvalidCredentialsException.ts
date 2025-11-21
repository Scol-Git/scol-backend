import { UnauthorizedException } from '@nestjs/common';

/**
 * Invalid Credentials Exception
 * 
 * Thrown when user provides incorrect email or password during login.
 * Extends NestJS UnauthorizedException for proper HTTP status code (401).
 * 
 * @example
 * throw new InvalidCredentialsException();
 */
export class InvalidCredentialsException extends UnauthorizedException {
  /**
   * Creates a new InvalidCredentialsException instance.
   */
  constructor() {
    super('Invalid email or password');
  }
}

