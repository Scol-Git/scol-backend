import type { ApplicationDocuments } from '@entity/entities/ApplicationDocuments.entity';
import type { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';

/** Prepared row for GET /applications/:id mapping (read-side only). */
export interface ApplicationRequirementWithDocuments {
  requirement: ApplicationRequiredDocuments;
  uploadedDocuments: ApplicationDocuments[];
}
