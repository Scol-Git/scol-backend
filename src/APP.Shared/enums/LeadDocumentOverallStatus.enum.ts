/**
 * High-level status of a lead-scoped document aggregate (varchar in DB).
 */
export enum LeadDocumentOverallStatus {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Replaced = 'REPLACED',
}
