import { Injectable } from '@nestjs/common';
import { In, IsNull } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { CrmStageRequiredDocumentDto } from '@shared/dtos/crm/universities/CrmUniversityDetailsResponseDto';

@Injectable()
export class UniStageRequiredDocumentsResolver {
  constructor(private readonly db: AppDbContext) {}

  /**
   * Loads country-scoped required documents for many stages in one query,
   * grouped by sysApplicationStageId.
   */
  async resolveByStages(
    sysCountryId: string,
    sysApplicationStageIds: string[],
  ): Promise<Map<string, CrmStageRequiredDocumentDto[]>> {
    const result = new Map<string, CrmStageRequiredDocumentDto[]>();
    if (sysApplicationStageIds.length === 0) {
      return result;
    }

    const rows = await this.db.sysStageRequiredDocuments.find({
      where: {
        sysCountryId,
        sysApplicationStageId: In(sysApplicationStageIds),
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: { SysDocumentType: true },
      order: { displayOrder: 'ASC' },
    });

    rows.sort((a, b) => {
      const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      const an = a.SysDocumentType?.documentTypeName ?? '';
      const bn = b.SysDocumentType?.documentTypeName ?? '';
      return an.localeCompare(bn);
    });

    for (const row of rows) {
      const list = result.get(row.sysApplicationStageId) ?? [];
      list.push({
        documentTypeId: row.sysDocumentTypeId,
        documentTypeCode: row.SysDocumentType?.documentTypeCode ?? '',
        documentTypeName: row.SysDocumentType?.documentTypeName ?? '',
        isRequired: row.isRequired,
        minCount: row.minCount,
        maxCount: row.maxCount,
      });
      result.set(row.sysApplicationStageId, list);
    }

    return result;
  }
}
