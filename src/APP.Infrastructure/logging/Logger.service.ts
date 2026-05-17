import { Injectable, LoggerService } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ILogger } from '@shared/interfaces/logging';

@Injectable()
export class Logger implements ILogger, LoggerService {
  private _context: string = Logger.name;

  constructor(private readonly pino: PinoLogger) {
    this.pino.setContext(Logger.name);
  }

  setContext(context: string): void {
    this._context = context;
    this.pino.setContext(context);
  }

  // ─── Your app code uses these ─────────────────────────────────────────────

  LogInfo(message: string, meta?: Record<string, unknown>): void {
    this.pino.info({ context: this._context, ...meta }, message);
  }

  LogWarning(message: string, meta?: Record<string, unknown>): void {
    this.pino.warn({ context: this._context, ...meta }, message);
  }

  LogError(
    message: string,
    error?: unknown,
    meta?: Record<string, unknown>,
  ): void {
    if (error instanceof Error) {
      this.pino.error(
        { context: this._context, err: error, ...(meta ?? {}) },
        message,
      );
    } else {
      this.pino.error({ context: this._context, ...(meta ?? {}) }, message);
    }
  }

  LogDebug(message: string, meta?: Record<string, unknown>): void {
    this.pino.debug({ context: this._context, ...meta }, message);
  }

  // ─── NestJS framework uses these (app.useLogger) ─────────────────────────

  log(message: any, context?: string): void {
    this.pino.info({ context: context ?? this._context }, String(message));
  }

  error(message: any, trace?: string, context?: string): void {
    this.pino.error(
      { context: context ?? this._context, trace },
      String(message),
    );
  }

  warn(message: any, context?: string): void {
    this.pino.warn({ context: context ?? this._context }, String(message));
  }

  debug(message: any, context?: string): void {
    this.pino.debug({ context: context ?? this._context }, String(message));
  }

  verbose(message: any, context?: string): void {
    this.pino.trace({ context: context ?? this._context }, String(message));
  }
}
