import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { PublishStatus } from '@shared/enums/crm/PublishStatus.enum';
import type { CrmUniversityListRequestDto } from '@shared/dtos/crm/universities/CrmUniversityListRequestDto';
import type { CrmUniversityListResponseDto } from '@shared/dtos/crm/universities/CrmUniversityListResponseDto';

interface Row {
  uniId: string;
  uniName: string;
  countryName: string | null;
  cityName: string | null;
  logoUrl: string | null;
  isPublished: boolean;
  importBatchId: string | null;
  intakeCount: string | number;
}

/** Lists universities (including draft ones, which may have zero courses and never show in the course grid). */
@Injectable()
export class CrmUniversityListService {
  constructor(private readonly db: AppDbContext) {}

  async list(dto: CrmUniversityListRequestDto, includeDrafts = true): Promise<CrmUniversityListResponseDto> {
    const page = dto.page ?? 1;
    const pageSize = Math.min(dto.pageSize ?? 20, 100);
    const status = includeDrafts ? (dto.publishStatus ?? PublishStatus.ALL) : PublishStatus.PUBLISHED;

    const base = this.db.universities
      .createQueryBuilder('u')
      .leftJoin('u.SysCountry', 'country')
      .leftJoin('u.SysCity', 'city');

    if (status === PublishStatus.DRAFT) base.andWhere('u.isPublished = false');
    if (status === PublishStatus.PUBLISHED) base.andWhere('u.isPublished = true');
    if (includeDrafts && dto.importBatchId) {
      base.andWhere('u.importBatchId = :batchId', { batchId: dto.importBatchId });
    }
    if (dto.search?.trim()) base.andWhere('u.uniName ILIKE :search', { search: `%${dto.search.trim()}%` });

    const total = await base.clone().getCount();

    const rows = await base
      .select('u.id', 'uniId')
      .addSelect('u.uniName', 'uniName')
      .addSelect('country.countryName', 'countryName')
      .addSelect('city.cityName', 'cityName')
      .addSelect('u.logoUrl', 'logoUrl')
      .addSelect('u.isPublished', 'isPublished')
      .addSelect('u.importBatchId', 'importBatchId')
      .addSelect(
        `(SELECT count(*) FROM "UniCourseIntakes" ci
          JOIN "UniCourses" c ON c.id = ci."uniCourseId"
          WHERE c."uniId" = "u"."id" AND c."deletedAt" IS NULL AND ci."deletedAt" IS NULL
          ${includeDrafts ? '' : 'AND ci."isPublished" = true'})`,
        'intakeCount',
      )
      .orderBy('u.uniName', 'ASC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<Row>();

    return {
      items: rows.map((r) => ({
        uniId: r.uniId,
        uniName: r.uniName,
        countryName: r.countryName ?? null,
        cityName: r.cityName ?? null,
        logoUrl: r.logoUrl ?? null,
        isPublished: r.isPublished,
        importBatchId: r.importBatchId ?? null,
        intakeCount: Number(r.intakeCount),
      })),
      page,
      pageSize,
      total,
    };
  }
}
