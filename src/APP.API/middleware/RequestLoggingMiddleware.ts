import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import type { ILogger } from '@shared/interfaces/logging/ILogger.interface';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/**
 * Middleware to log incoming HTTP requests with body for POST/PUT/PATCH.
 * 
 * Logs request details including:
 * - Method, URL, headers
 * - Request body (for POST/PUT/PATCH)
 * - Response status and duration
 * 
 * Similar to .NET Core's request logging middleware.
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(
    @Inject(ILoggerToken) private readonly _logger: ILogger,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, headers } = req;

    // Log request (include body for POST/PUT/PATCH)
    const shouldLogBody = ['POST', 'PUT', 'PATCH'].includes(method);
    
    this._logger.LogInfo(`Incoming ${method} ${originalUrl}`, {
      method,
      url: originalUrl,
      userAgent: headers['user-agent'],
      ...(shouldLogBody && req.body ? { body: req.body } : {}),
    });

    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
      res.send = originalSend;
      return res.send(data);
    };

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      if (statusCode >= 400) {
        this._logger.LogWarning(
          `${method} ${originalUrl} ${statusCode} - ${duration}ms`,
          {
            method,
            url: originalUrl,
            statusCode,
            duration,
          },
        );
      } else {
        this._logger.LogInfo(
          `${method} ${originalUrl} ${statusCode} - ${duration}ms`,
          {
            method,
            url: originalUrl,
            statusCode,
            duration,
          },
        );
      }
    });

    next();
  }
}

