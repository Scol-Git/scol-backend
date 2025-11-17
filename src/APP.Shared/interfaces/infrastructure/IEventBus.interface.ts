import type { IDomainEvent, IEventHandler } from './types';

/**
 * Interface for domain event bus.
 * 
 * Provides abstraction for publishing and handling domain events.
 * Follows .NET Core's MediatR IPublisher pattern.
 * 
 * @interface IEventBus
 * 
 * @example
 * ```typescript
 * // Publish event
 * await eventBus.publish(new TodoCreatedEvent(todoId));
 * 
 * // Subscribe to event
 * const unsubscribe = eventBus.subscribe(
 *   'TodoCreated',
 *   async (event) => { /* handle event *\/ }
 * );
 * ```
 */
export interface IEventBus {
  /**
   * Publish a domain event.
   * 
   * @param event - Domain event to publish
   */
  publish<TEvent extends IDomainEvent>(event: TEvent): Promise<void>;

  /**
   * Publish multiple domain events.
   * 
   * @param events - Array of domain events to publish
   */
  publishMany(events: IDomainEvent[]): Promise<void>;

  /**
   * Subscribe to a domain event.
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

