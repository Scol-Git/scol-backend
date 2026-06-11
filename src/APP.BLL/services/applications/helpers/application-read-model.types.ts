import type { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import type { SysApplicationStage } from '@entity/entities/SysApplicationStage.entity';
import type { ApplicationStageProgressState } from '@shared/enums/ApplicationStageProgressState.enum';
import type { ApplicationRequirementStatus } from '@shared/enums/ApplicationRequirementStatus.enum';

/** Unified uploaded document read model across application- and lead-scoped ownership. */
export interface UploadedDocumentView {
  documentId: string;
  documentScope: 'APPLICATION' | 'LEAD';
  fileName: string | null;
  overallStatus: string | null;
  createdAt: Date;
}

/** Prepared row for GET /applications/:id mapping (read-side only). */
export interface ApplicationRequirementWithDocuments {
  requirement: ApplicationRequiredDocuments;
  uploadedDocuments: UploadedDocumentView[];
}

/** CRM details: requirements and uploaded documents grouped by workflow stage. */
export interface ApplicationStageRequirementsWithDocuments {
  stage: SysApplicationStage;
  requirementsWithDocuments: ApplicationRequirementWithDocuments[];
}

export interface StageProgressViewModel {
  totalStages: number;
  completedStages: number;
  currentStage: SysApplicationStage;
  items: Array<{
    stage: SysApplicationStage;
    state: ApplicationStageProgressState;
  }>;
}

export interface DocumentProgressViewModel {
  totalRequired: number;
  uploadedCount: number;
  items: Array<{
    requirement: ApplicationRequiredDocuments;
    order: number;
  }>;
}
