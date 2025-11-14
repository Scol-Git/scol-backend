/**
 * Interface for domain event bus
 * 
 * Provides abstraction for publishing and handling domain events.
 * Following .NET's MediatR IPublisher pattern.
 * 
 * @interface IEventBus
 * 
 * TODO: Implement EventBus service (in-process or RabbitMQ-based) in Phase 3+
 */
export interface IEventBus {
  /**
   * Publish a domain event
   * 
   * @param event - Domain event to publish
   */
  publish<TEvent extends IDomainEvent>(event: TEvent): Promise<void>;

  /**
   * Publish multiple domain events
   * 
   * @param events - Array of domain events to publish
   */
  publishMany(events: IDomainEvent[]): Promise<void>;

  /**
   * Subscribe to a domain event
   * 
   * @param eventType - Type of event to subscribe to
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  subscribe<TEvent extends IDomainEvent>(
    eventType: string,
    handler: IEventHandler<TEvent>,
  ): () => void;
}

/**
 * Base interface for domain events
 */
export interface IDomainEvent {
  /** Unique event identifier */
  eventId: string;

  /** Event type/name */
  eventType: string;

  /** Timestamp when event occurred */
  occurredAt: Date;

  /** Aggregate ID (entity that raised the event) */
  aggregateId: string;

  /** Organization ID (for multi-tenancy) */
  orgId?: string;

  /** User ID who triggered the event */
  userId?: string;

  /** Correlation ID for tracking related events */
  correlationId?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Interface for event handlers
 */
export interface IEventHandler<TEvent extends IDomainEvent> {
  /**
   * Handle the domain event
   * 
   * @param event - Domain event to handle
   */
  handle(event: TEvent): Promise<void>;
}


