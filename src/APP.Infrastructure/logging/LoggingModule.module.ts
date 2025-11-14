/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import type { Options as PinoHttpOptions, StdSerializers } from 'pino-http';
import { randomUUID } from 'crypto';
import { Logger } from './Logger.service';
import { ILogger } from '@shared/tokens/injection.tokens';

const CORRELATION_HEADER = 'x-correlation-id';

@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: (): { pinoHttp: PinoHttpOptions } => {
        const isDev = process.env.NODE_ENV === 'development';

        const pinoHttp: PinoHttpOptions = {
          // log level
          useLevel: isDev ? 'debug' : 'info',

          // 🚫 disable automatic access logs
          autoLogging: false,

          /**
           * ✅ One correlationId per request
           *
           * - If client sends x-correlation-id or x-request-id, reuse it
           * - Otherwise generate a new UUID
           * - pino-http will put the id on req.id and in every log
           */
          genReqId: (req) => {
            const headerId =
              (req.headers[CORRELATION_HEADER] as string) ||
              (req.headers['x-request-id'] as string);

            return headerId ?? randomUUID();
          },

          /**
           * ✅ Attach correlationId to every log line
           *
           * nestjs-pino binds a request-scoped logger which has access
           * to req.id (populated by genReqId above).
           */
          customProps: (req) => {
            return {
              correlationId: (req as any).id,
            };
          },

          // 🚫 strip req/res from bound logger so your app logs don't include them
          serializers: {
            // keep error serializer default behavior
            err: ((e: unknown) => e) as StdSerializers['err'],
            // hide req/res in outputs
            req: (() => undefined) as unknown as StdSerializers['req'],
            res: (() => undefined) as unknown as StdSerializers['res'],
          },

          // redact secrets
          redact: [
            'req.headers.authorization',
            'authorization',
            'password',
            'token',
          ],
        };

        if (isDev) {
          // pretty print in dev
          (pinoHttp as any).transport = {
            target: 'pino-pretty',
            options: { colorize: true, singleLine: false },
          };
        }

        return { pinoHttp };
      },
    }),
  ],
  providers: [
    // Register Logger with interface token (following .NET DI pattern)
    {
      provide: ILogger,
      useClass: Logger,
    },
  ],
  exports: [LoggerModule, ILogger],
})
export class LoggingModule {}
