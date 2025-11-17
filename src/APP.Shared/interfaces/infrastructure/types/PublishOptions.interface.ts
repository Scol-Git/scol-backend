/**
 * Options for publishing messages to a message broker.
 * 
 * Used by IMessageSender interface for configuring message publishing behavior.
 * 
 * @interface PublishOptions
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

