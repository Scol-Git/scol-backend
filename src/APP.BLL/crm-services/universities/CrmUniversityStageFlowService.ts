import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { UniApplicationStage } from '@entity/entities/UniApplicationStage.entity';
import { ValidationException } from '@shared/exceptions/ValidationException';
import type { UpdateCrmUniversityStageFlowRequestDto } from '@shared/dtos/crm/universities/UpdateCrmUniversityStageFlowRequestDto';
import type { CrmStageFlowItemDto } from '@shared/dtos/crm/universities/CrmUniversityDetailsResponseDto';
import type { CrmUniversityStageFlowResponseDto } from '@shared/dtos/crm/universities/CrmUniversityStageFlowResponseDto';
import { CrmUniversityLookupService } from './helpers/CrmUniversityLookupService';
import { UniStageFlowSeeder } from './helpers/UniStageFlowSeeder';
import { UniStageRequiredDocumentsResolver } from './helpers/UniStageRequiredDocumentsResolver';
import { CrmUniversityStageFlowMapper } from './mappers/CrmUniversityStageFlowMapper';

@Injectable()
export class CrmUniversityStageFlowService {
  constructor(
    private readonly db: AppDbContext,
    private readonly lookupService: CrmUniversityLookupService,
    private readonly seeder: UniStageFlowSeeder,
    private readonly docsResolver: UniStageRequiredDocumentsResolver,
    private readonly mapper: CrmUniversityStageFlowMapper,
  ) {}

  async getFlow(uniId: string): Promise<CrmStageFlowItemDto[]> {
    const university = await this.lookupService.loadUniversityOrThrow(uniId);
    await this.seeder.ensureSeeded(uniId);

    const rows = await this.loadFlowRows(uniId);
    const docsByStage = await this.docsResolver.resolveByStages(
      university.sysCountryId,
      rows.map((r) => r.sysApplicationStageId),
    );

    return this.mapper.toFlowItems(rows, docsByStage);
  }

  async replaceFlow(
    uniId: string,
    dto: UpdateCrmUniversityStageFlowRequestDto,
  ): Promise<CrmUniversityStageFlowResponseDto> {
    await this.lookupService.loadUniversityOrThrow(uniId);
    await this.seeder.ensureSeeded(uniId);

    const existing = await this.loadFlowRows(uniId);
    this.validateFullReplace(existing, dto);

    const byId = new Map(existing.map((row) => [row.id, row]));

    await this.db.transaction(async (manager) => {
      const repo = manager.getRepository(UniApplicationStage);
      for (const item of dto.stages) {
        const row = byId.get(item.stageId)!;
        row.displayOrder = item.displayOrder;
        row.isEnabled = item.isEnabled;
        await repo.save(row);
      }
    });

    const flow = await this.getFlow(uniId);

    return {
      success: true,
      message: 'Application stage flow updated successfully',
      customApplicationStageFlow: flow,
    };
  }

  private async loadFlowRows(uniId: string): Promise<UniApplicationStage[]> {
    return this.db.uniApplicationStages.find({
      where: { uniId, deletedAt: IsNull() },
      relations: { SysApplicationStage: true },
      order: { displayOrder: 'ASC' },
    });
  }

  private validateFullReplace(
    existing: UniApplicationStage[],
    dto: UpdateCrmUniversityStageFlowRequestDto,
  ): void {
    const submittedIds = dto.stages.map((s) => s.stageId);
    const uniqueSubmitted = new Set(submittedIds);
    if (uniqueSubmitted.size !== submittedIds.length) {
      throw new ValidationException('Duplicate stageId in request', {
        stages: ['Each stageId must appear exactly once'],
      });
    }

    const displayOrders = dto.stages.map((s) => s.displayOrder);
    const uniqueOrders = new Set(displayOrders);
    if (uniqueOrders.size !== displayOrders.length) {
      throw new ValidationException('Duplicate displayOrder in request', {
        stages: ['Each displayOrder must be unique'],
      });
    }

    const existingIds = new Set(existing.map((r) => r.id));
    const missing: string[] = [];
    const unknown: string[] = [];

    for (const id of existingIds) {
      if (!uniqueSubmitted.has(id)) missing.push(id);
    }
    for (const id of uniqueSubmitted) {
      if (!existingIds.has(id)) unknown.push(id);
    }

    if (missing.length > 0 || unknown.length > 0) {
      const errors: Record<string, string[]> = {};
      if (missing.length > 0) errors.missingStageIds = missing;
      if (unknown.length > 0) errors.unknownStageIds = unknown;
      throw new ValidationException(
        'Stage flow must include exactly the university stage set',
        errors,
      );
    }
  }
}
