export interface ILogger {
  LogInfo(message: string, meta?: Record<string, unknown>): void;
  LogWarning(message: string, meta?: Record<string, unknown>): void;
  LogError(
    message: string,
    error?: unknown,
    meta?: Record<string, unknown>,
  ): void;
  LogDebug(message: string, meta?: Record<string, unknown>): void;

  // NestJS LoggerService compatibility
  log(message: any, ...optionalParams: any[]): any;
  error(message: any, ...optionalParams: any[]): any;
  warn(message: any, ...optionalParams: any[]): any;
  debug?(message: any, ...optionalParams: any[]): any;
  verbose?(message: any, ...optionalParams: any[]): any;
}
