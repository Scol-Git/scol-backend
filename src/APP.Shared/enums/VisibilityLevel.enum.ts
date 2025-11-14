/**
 * Defines visibility levels for entities in multi-tenant scenarios.
 * Controls how entities are shared across organizations.
 */
export enum VisibilityLevel {
  /** Entity is only visible within its own organization */
  Private = 'Private',

  /** Entity is visible to all organizations */
  Public = 'Public',

  /** Entity is visible to the owning organization and its child organizations */
  UptoChildOrganization = 'UptoChildOrganization',
}
