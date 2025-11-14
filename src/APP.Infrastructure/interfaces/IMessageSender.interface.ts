/**
 * Interface for message bus/queue service (RabbitMQ implementation)
 * 
 * Provides abstraction for publishing messages to a message broker.
 * Following .NET's IMessageBus pattern.
 * 
 * @interface IMessageSender
 * 
 * TODO: Implement RabbitMQ service in Phase 3+
 */
export interface IMessageSender {
  /**
   * Publish a message to a queue or exchange
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
   * Publish multiple messages in batch
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
   * Publish a message with delay
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

/**
 * Options for publishing messages
 */
export interface PublishOptions {
  /** Routing key for exchanges */
  routingKey?: string;

  /** Message priority (0-10) */
  priority?: number;

  /** Message expiration in milliseconds */
  expiration?: number;

  /** Correlation ID for request-reply patterns */
  correlationId?: string;

  /** Reply-to queue name */
  replyTo?: string;

  /** Custom headers */
  headers?: Record<string, any>;

  /** Whether message should be persistent */
  persistent?: boolean;
}


