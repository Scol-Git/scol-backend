/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import type { Options as PinoHttpOptions, StdSerializers } from 'pino-http';
import { randomUUID } from 'crypto';
import { Logger } from './Logger.service';
import { ILogger } from '@shared/tokens/injection.tokens';
import { getAppStage } from '../config/getAppStage';

const CORRELATION_HEADER = 'x-correlation-id';

@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: (): { pinoHttp: PinoHttpOptions } => {
        const stage = getAppStage();
        const isDev = stage === 'dev';

        const pinoHttp: PinoHttpOptions = {
          level: isDev ? 'debug' : 'info',
          useLevel: isDev ? 'debug' : 'info',
          autoLogging: false,

          base: {
            service: 'scol-backend',
            version: process.env.APP_VERSION ?? 'unknown',
            env: stage,
          },

          genReqId: (req) => {
            const headerId =
              (req.headers[CORRELATION_HEADER] as string) ||
              (req.headers['x-request-id'] as string);
            return headerId ?? randomUUID();
          },

          customProps: (req) => ({
            correlationId: (req as any).id,
          }),

          serializers: {
            err: ((e: unknown) => e) as StdSerializers['err'],
            req: (() => undefined) as unknown as StdSerializers['req'],
            res: (() => undefined) as unknown as StdSerializers['res'],
          },

          redact: [
            'req.headers.authorization',
            'authorization',
            'password',
            'token',
          ],
        };

        if (isDev) {
          // Local: pretty print, NR not active
          (pinoHttp as any).transport = {
            target: 'pino-pretty',
            options: { colorize: true, singleLine: false },
          };
        } else {
          // QA/Prod: attach NR trace enricher so logs link to APM traces
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const nrEnricher =
              require('@newrelic/pino-enricher') as () => unknown;
            const mixin = nrEnricher();
            if (typeof mixin === 'function') {
              pinoHttp.mixin = mixin as (
                mergeObject: object,
                level: number,
              ) => object;
            }
          } catch {
            // NR agent not available, continue without enricher
          }
        }

        return { pinoHttp };
      },
    }),
  ],
  providers: [
    {
      provide: ILogger,
      useClass: Logger,
    },
  ],
  exports: [LoggerModule, ILogger],
})
export class LoggingModule {}
