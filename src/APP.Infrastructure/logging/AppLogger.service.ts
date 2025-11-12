import { Injectable, LoggerService } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class AppLogger implements LoggerService {
  constructor(private readonly pino: PinoLogger) {
    this.pino.setContext(AppLogger.name);
  }

  // --- .NET-style methods ---
  LogInfo(message: string, meta?: Record<string, unknown>): void {
    this.pino.info(meta ?? {}, message);
  }

  LogWarning(message: string, meta?: Record<string, unknown>): void {
    this.pino.warn(meta ?? {}, message);
  }

  LogError(
    message: string,
    error?: unknown,
    meta?: Record<string, unknown>,
  ): void {
    if (error instanceof Error) {
      this.pino.error({ err: error, ...(meta ?? {}) }, message);
    } else {
      this.pino.error(meta ?? {}, message);
    }
  }

  // --- Nest LoggerService compatibility ---
  log(message: any, ...optionalParams: any[]): any {
    this.pino.info(optionalParams, message);
  }
  error(message: any, ...optionalParams: any[]): any {
    this.pino.error(optionalParams, message);
  }
  warn(message: any, ...optionalParams: any[]): any {
    this.pino.warn(optionalParams, message);
  }
  debug(message: any, ...optionalParams: any[]): any {
    this.pino.debug(optionalParams, message);
  }
  verbose(message: any, ...optionalParams: any[]): any {
    // pino doesn’t have "verbose"; map to trace
    this.pino.trace(optionalParams, message);
  }
}
