import type { ApplicationDocuments } from '@entity/entities/ApplicationDocuments.entity';
import type { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import type { SysApplicationStage } from '@entity/entities/SysApplicationStage.entity';
import type { ApplicationStageProgressState } from '@shared/enums/ApplicationStageProgressState.enum';

/** Prepared row for GET /applications/:id mapping (read-side only). */
export interface ApplicationRequirementWithDocuments {
  requirement: ApplicationRequiredDocuments;
  uploadedDocuments: ApplicationDocuments[];
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
