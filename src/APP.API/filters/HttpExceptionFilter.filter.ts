/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
import type { ILogger } from '@shared/interfaces/logging/ILogger.interface';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
}

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(ILoggerToken) private readonly _logger: ILogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Prefer the “response body” from HttpException, if provided
    let detail = 'Internal server error';
    if (isHttp) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') detail = payload;
      else if (payload && typeof payload === 'object' && 'message' in payload) {
        const msg = (payload as any).message;
        detail = Array.isArray(msg)
          ? msg.join(', ')
          : String(msg ?? exception.message);
      } else {
        detail = exception.message;
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
      title: isHttp ? 'HTTP Error' : 'Internal Server Error',
      status,
      detail,
      instance: req.url,
      timestamp: new Date().toISOString(),
    };

    res.status(status).type('application/problem+json').json(problem);
  }
}
