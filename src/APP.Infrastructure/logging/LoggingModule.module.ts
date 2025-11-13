// src/APP.Infrastructure/logging/logging.module.ts
import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import type { Options as PinoHttpOptions, StdSerializers } from 'pino-http';
import { Logger } from './Logger.service';

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

          // 🚫 strip req/res from bound logger so your app logs don't include them
          serializers: {
            // keep error serializer default behavior
            err: ((e: unknown) => e) as StdSerializers['err'],
            // hide req/res in outputs
            req: (() => undefined) as unknown as StdSerializers['req'],
            res: (() => undefined) as unknown as StdSerializers['res'],
          },

          // don’t add per-request props to every log
          customProps: () => ({}),

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
  providers: [Logger],
  exports: [LoggerModule, Logger],
})
export class LoggingModule {}
