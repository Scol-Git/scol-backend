import { IDomainEvent } from './IDomainEvent.interface';

/**
 * Interface for event handlers.
 * 
 * Handlers process domain events published through the event bus.
 * Follows .NET Core's IEventHandler pattern.
 * 
 * @interface IEventHandler
 * @template TEvent - The type of domain event this handler processes
 * @example
 * ```typescript
 * class TodoCreatedHandler implements IEventHandler<TodoCreatedEvent> {
 *   async handle(event: TodoCreatedEvent): Promise<void> {
 *     // Handle the event
 *   }
 * }
 * ```
 */
export interface IEventHandler<TEvent extends IDomainEvent> {
  /**
   * Handle the domain event.
   * 
   * @param event - Domain event to handle
   */
  handle(event: TEvent): Promise<void>;
}

