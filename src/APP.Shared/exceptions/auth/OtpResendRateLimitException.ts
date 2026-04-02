import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * OTP Resend Rate Limit Exception
 *
 * Thrown when OTP resend rate limits are exceeded.
 * Returns HTTP 429 Too Many Requests with Retry-After header.
 */
export class OtpResendRateLimitException extends HttpException {
  constructor(message: string = 'Missing message parameter', retryAfter: number) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message,
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

