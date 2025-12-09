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
import { DomainException } from '@shared/exceptions/DomainException';
import { ErrorCode } from '@shared/enums/ErrorCode.enum';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  code?: string;
}

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(ILoggerToken) private readonly _logger: ILogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const isDomain =
      exception instanceof DomainException ||
      exception instanceof BusinessException;

    const status = isHttp
      ? exception.getStatus()
      : isDomain
        ? HttpStatus.BAD_REQUEST
        : HttpStatus.SERVICE_UNAVAILABLE;

    // Prefer the "response body" from HttpException, if provided
    let detail = 'Internal server error';
    let code: string | undefined;

    if (isDomain) {
      detail = (exception as DomainException).message;
      code = (exception as BusinessException).code ?? ErrorCode.DOMAIN_ERROR;
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

    const problem: ProblemDetails = {
      type: 'about:blank',
      title: isHttp
        ? 'HTTP Error'
        : isDomain
          ? 'Domain Error'
          : 'Service Unavailable',
      status,
      detail,
      instance: req.url,
      timestamp: new Date().toISOString(),
      ...(code ? { code } : {}),
    };

    res.status(status).type('application/problem+json').json(problem);
  }
}
