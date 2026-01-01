import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import type { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/**
 * Middleware to log incoming HTTP requests with body for POST/PUT/PATCH.
 *
 * Logs request details including:
 * - Request ID (for tracing)
 * - Method, URL, headers
 * - Request body (for POST/PUT/PATCH)
 * - Response status and duration
 *
 * Similar to .NET Core's request logging middleware.
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(@Inject(ILoggerToken) private readonly _logger: ILogger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, headers } = req;

    // Get request ID (set by pino-http in LoggingModule, or from header)
    const pinoReq = req as Request & { id?: string };
    const requestId: string =
      pinoReq.id || (headers['x-request-id'] as string) || 'unknown';

    // Log request (include body for POST/PUT/PATCH)
    const shouldLogBody = ['POST', 'PUT', 'PATCH'].includes(method);

    this._logger.LogInfo(`Request: ${method} ${originalUrl}`, {
      requestId,
      method,
      url: originalUrl,
      userAgent: headers['user-agent'],
      ...(shouldLogBody && req.body ? { body: req.body } : {}),
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const logData: Record<string, unknown> = {
        requestId,
        method,
        url: originalUrl,
        statusCode,
        duration,
      };

      if (statusCode >= 400) {
        this._logger.LogWarning(
          `Response: ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
          logData,
        );
      } else {
        this._logger.LogInfo(
          `Response: ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
          logData,
        );
      }
    });

    next();
  }
}
