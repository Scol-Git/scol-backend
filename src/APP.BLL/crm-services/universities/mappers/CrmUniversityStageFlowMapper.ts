import { Injectable } from '@nestjs/common';
import type { UniApplicationStage } from '@entity/entities/UniApplicationStage.entity';
import type {
  CrmStageFlowItemDto,
  CrmStageRequiredDocumentDto,
} from '@shared/dtos/crm/universities/CrmUniversityDetailsResponseDto';

@Injectable()
export class CrmUniversityStageFlowMapper {
  toFlowItems(
    rows: UniApplicationStage[],
    docsBySysStageId: Map<string, CrmStageRequiredDocumentDto[]>,
  ): CrmStageFlowItemDto[] {
    return rows.map((row) => ({
      stageId: row.id,
      stageCode: row.SysApplicationStage?.stageCode ?? '',
      stageName: row.SysApplicationStage?.stageName ?? null,
      displayOrder: row.displayOrder,
      isEnabled: row.isEnabled,
      requiredDocuments: docsBySysStageId.get(row.sysApplicationStageId) ?? [],
    }));
  }
}
