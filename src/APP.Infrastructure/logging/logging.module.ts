// src/APP.Infrastructure/logging/logging.module.ts
import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import type { Options as PinoHttpOptions } from 'pino-http';
import { AppLogger } from './AppLogger.service';

@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: (): { pinoHttp: PinoHttpOptions } => {
        const isDev = process.env.NODE_ENV === 'development';

        const pinoHttp: PinoHttpOptions = {
          // NOTE: pino-http types use `useLevel`, not `level`
          useLevel: isDev ? 'debug' : 'info',
          redact: [
            'req.headers.authorization',
            'authorization',
            'password',
            'token',
          ],
          genReqId: (req) =>
            (req.headers['x-request-id'] as string) ??
            `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          customProps: (req) => ({
            path: req.url,
            method: req.method,
          }),
        };

        if (isDev) {
          // TS type for transport may lag; keep a local, narrow cast only here
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          (pinoHttp as any).transport = {
            target: 'pino-pretty',
            options: { colorize: true, singleLine: false },
          };
        }

        return { pinoHttp };
      },
    }),
  ],
  providers: [AppLogger],
  exports: [LoggerModule, AppLogger],
})
export class LoggingModule {}
