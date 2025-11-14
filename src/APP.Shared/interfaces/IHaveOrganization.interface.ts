import { VisibilityLevel } from '@shared/enums/VisibilityLevel.enum';

/**
 * Interface for entities that belong to an organization (multi-tenant entities).
 * Entities implementing this interface can be filtered by organization ID.
 */
export interface IHaveOrganization {
  /** Organization ID this entity belongs to */
  orgId: string;

  /** Visibility level for cross-organization access control (optional) */
  visibilityLevel?: VisibilityLevel;
}


