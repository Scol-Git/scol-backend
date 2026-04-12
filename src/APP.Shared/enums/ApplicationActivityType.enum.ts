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
  DocRejected = 'DOC_REJECTED',
  DocReuploaded = 'DOC_REUPLOADED',
}
