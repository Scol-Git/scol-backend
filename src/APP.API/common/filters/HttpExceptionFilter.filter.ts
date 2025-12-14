import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { BusinessException } from '@shared/exceptions/BusinessException';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';
import { captureException } from '@infra/monitoring/sentry';

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(ILoggerToken) private readonly _logger: ILogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const isValidation = exception instanceof ValidationException;
    const isBusiness = exception instanceof BusinessException;

    const status = isHttp
      ? exception.getStatus()
      : isValidation
        ? HttpStatus.BAD_REQUEST // Client-side validation errors
        : isBusiness
          ? HttpStatus.INTERNAL_SERVER_ERROR // Server-side business errors
          : HttpStatus.SERVICE_UNAVAILABLE;

    // Prefer the "response body" from HttpException, if provided
    let detail = 'Internal server error';
    let code: string | undefined;

    if (isValidation || isBusiness) {
      detail = (exception as ValidationException | BusinessException).message;
      if (isBusiness) {
        code = (exception as BusinessException).code ?? ErrorCode.DOMAIN_ERROR;
      }
    }

    if (isHttp) {
      const payload = exception.getResponse();
      let msgString: string | undefined;
      if (typeof payload === 'string') {
        msgString = payload;
      } else if (
        payload &&
        typeof payload === 'object' &&
        'message' in payload
      ) {
        const msg = (payload as { message?: string | string[] }).message;
        msgString = Array.isArray(msg)
          ? msg.join(', ')
          : String(msg ?? exception.message);
      } else {
        msgString = exception.message;
      }

      // Specialize auth errors for clarity
      if (status === HttpStatus.UNAUTHORIZED) {
        if (msgString?.toLowerCase().includes('missing authentication token')) {
          detail = 'Missing authentication token. Include Authorization: Bearer <access-token>';
        } else if (msgString?.toLowerCase().includes('invalid or expired token')) {
          detail = 'Invalid or expired authentication token. Please re-login or refresh the token.';
        } else {
          detail = msgString ?? 'Unauthorized';
        }
      } else {
        detail = msgString ?? 'Internal server error';
      }
    }

    this._logger.LogError('HTTP Error', exception as any, {
      path: req.url,
      method: req.method,
      status,
      reqId: req.headers['x-request-id'],
    });

    // Capture 5xx errors and unexpected exceptions with Sentry
    // Skip expected 4xx validation/auth errors to avoid noise
    if (status >= 500 || (!isHttp && !isValidation && !isBusiness)) {
      captureException(exception, {
        path: req.url,
        method: req.method,
        status,
        requestId: req.headers['x-request-id'],
      });
    }

    // Build error response using BaseResponseDto structure
    const errorResponse = new ErrorResponseDto();
    errorResponse.status = 'error';
    errorResponse.message = detail;
    errorResponse.statusCode = status;

    // Handle 429 Too Many Requests - set Retry-After header and error code
    if (status === HttpStatus.TOO_MANY_REQUESTS && isHttp) {
      const payload = exception.getResponse();
      if (
        payload &&
        typeof payload === 'object' &&
        'retryAfter' in payload
      ) {
        const retryAfter = (payload as { retryAfter?: number }).retryAfter;
        if (retryAfter !== undefined && retryAfter > 0) {
          res.setHeader('Retry-After', retryAfter.toString());
        }
      }
      // Set error code for rate limit errors
      errorResponse.error = {
        code: 'RATE_LIMIT_EXCEEDED',
      };
    } else if (code || isValidation) {
      // Add error details if available
      errorResponse.error = {};

      // Prioritize code from ValidationException if available
      if (exception instanceof ValidationException && exception.code) {
        errorResponse.error.code = exception.code;
      } else if (code) {
        errorResponse.error.code = code;
      }

      // Add validation field errors if present (only if no code is set)
      if (
        exception instanceof ValidationException &&
        exception.errors &&
        !exception.code
      ) {
        errorResponse.error.details = exception.errors;
      }
    }

    res.status(status).json(errorResponse);
  }
}
