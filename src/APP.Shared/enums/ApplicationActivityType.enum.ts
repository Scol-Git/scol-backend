/**
 * Kind of application journey event (varchar in DB).
 */
export enum ApplicationActivityType {
  ApplicationCreated = 'APPLICATION_CREATED',
  StageChanged = 'STAGE_CHANGED',
  StatusChanged = 'STATUS_CHANGED',
  DocumentRequirementChanged = 'DOCUMENT_REQUIREMENT_CHANGED',
  DocumentChanged = 'DOCUMENT_CHANGED',
  DocumentVersionChanged = 'DOCUMENT_VERSION_CHANGED',
  DocUploaded = 'DOC_UPLOADED',
  DocDeleted = 'DOC_DELETED',
  DocRejected = 'DOC_REJECTED',
  DocReuploaded = 'DOC_REUPLOADED',
  DocVerified = 'DOC_VERIFIED',
  DocStatusChanged = 'DOC_STATUS_CHANGED',
  RequirementStatusChanged = 'REQUIREMENT_STATUS_CHANGED',
}
