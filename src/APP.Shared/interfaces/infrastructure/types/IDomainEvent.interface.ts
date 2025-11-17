/**
 * Base interface for domain events.
 * 
 * All domain events must implement this interface.
 * Follows .NET Core's IDomainEvent pattern for domain-driven design.
 * 
 * @interface IDomainEvent
 * @example
 * ```typescript
 * class TodoCreatedEvent implements IDomainEvent {
 *   eventId: string;
 *   eventType: 'TodoCreated';
 *   occurredAt: Date;
 *   aggregateId: string;
 *   // ... other properties
 * }
 * ```
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

