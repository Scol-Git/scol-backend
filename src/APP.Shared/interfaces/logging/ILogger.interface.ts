/**
 * Interface for application logging service.
 * 
 * Provides structured logging capabilities similar to .NET Core's ILogger<T>.
 * Follows .NET Core naming conventions (LogInfo, LogWarning, LogError) while
 * also supporting NestJS's LoggerService interface.
 * 
 * @interface ILogger
 * 
 * @example
 * ```typescript
 * // Log info
 * logger.LogInfo('User logged in', { userId: '123' });
 * 
 * // Log warning
 * logger.LogWarning('Rate limit approaching', { current: 90, limit: 100 });
 * 
 * // Log error
 * logger.LogError('Failed to process request', error, { requestId: 'abc' });
 * ```
 */
export interface ILogger {
  /**
   * Log informational message (equivalent to .NET Core's LogInformation).
   * 
   * @param message - Log message
   * @param meta - Optional metadata/context object
   */
  LogInfo(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log warning message (equivalent to .NET Core's LogWarning).
   * 
   * @param message - Log message
   * @param meta - Optional metadata/context object
   */
  LogWarning(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log error message with optional exception (equivalent to .NET Core's LogError).
   * 
   * @param message - Log message
   * @param error - Optional error/exception object
   * @param meta - Optional metadata/context object
   */
  LogError(
    message: string,
    error?: unknown,
    meta?: Record<string, unknown>,
  ): void;

  /**
   * Log debug message (for development/troubleshooting).
   * 
   * @param message - Log message
   * @param meta - Optional metadata/context object
   */
  LogDebug?(message: string, meta?: Record<string, unknown>): void;

  // NestJS LoggerService compatibility methods
  log(message: any, ...optionalParams: any[]): any;
  error(message: any, ...optionalParams: any[]): any;
  warn(message: any, ...optionalParams: any[]): any;
  debug?(message: any, ...optionalParams: any[]): any;
  verbose?(message: any, ...optionalParams: any[]): any;
}

