/**
 * Shared Interfaces
 *
 * This module exports all interfaces used across the application.
 * Interfaces are organized by concern following .NET Core Clean Architecture principles.
 *
 * @module Interfaces
 *
 * @example
 * ```typescript
 * // Import specific interface
 * import { IOrganizationService } from '@shared/interfaces';
 *
 * // Import domain interfaces
 * import { ICurrentUser, IHaveOrganization } from '@shared/interfaces/domain';
 *
 * // Import infrastructure types
 * import { EmailMessage, IDomainEvent } from '@shared/interfaces/infrastructure/types';
 * ```
 */

// Domain interfaces
export * from './domain';

// Service interfaces
// export * from './services';

// Infrastructure interfaces
export * from './infrastructure';

// Mapping interfaces
export * from './mapping';

// Logging interfaces
export * from './logging';

// Security interfaces
export * from './security';
