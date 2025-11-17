import type { PublishOptions } from './types';

/**
 * Interface for message bus/queue service (RabbitMQ implementation).
 * 
 * Provides abstraction for publishing messages to a message broker.
 * Follows .NET Core's IMessageBus pattern.
 * 
 * @interface IMessageSender
 * 
 * @example
 * ```typescript
 * // Publish message
 * await messageSender.publish('notifications', {
 *   userId: '123',
 *   message: 'Hello'
 * });
 * 
 * // Publish with delay
 * await messageSender.publishDelayed(
 *   'notifications',
 *   message,
 *   5000, // 5 seconds
 *   { routingKey: 'email' }
 * );
 * ```
 */
export interface IMessageSender {
  /**
   * Publish a message to a queue or exchange.
   * 
   * @param queueOrExchange - Name of the queue or exchange
   * @param message - Message payload
   * @param options - Additional options (routing key, priority, etc.)
   */
  publish<T>(
    queueOrExchange: string,
    message: T,
    options?: PublishOptions,
  ): Promise<void>;

  /**
   * Publish multiple messages in batch.
   * 
   * @param queueOrExchange - Name of the queue or exchange
   * @param messages - Array of message payloads
   * @param options - Additional options
   */
  publishBatch<T>(
    queueOrExchange: string,
    messages: T[],
    options?: PublishOptions,
  ): Promise<void>;

  /**
   * Publish a message with delay.
   * 
   * @param queueOrExchange - Name of the queue or exchange
   * @param message - Message payload
   * @param delayMs - Delay in milliseconds
   * @param options - Additional options
   */
  publishDelayed<T>(
    queueOrExchange: string,
    message: T,
    delayMs: number,
    options?: PublishOptions,
  ): Promise<void>;
}

