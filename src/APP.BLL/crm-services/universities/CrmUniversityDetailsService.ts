import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { CrmUniversityDetailsResponseDto } from '@shared/dtos/crm/universities/CrmUniversityDetailsResponseDto';
import { CrmUniversityLookupService } from './helpers/CrmUniversityLookupService';
import { groupActiveIntakesByQuarter } from './helpers/ActiveIntakeQuarterGrouper';
import { CrmUniversityDetailsMapper } from './mappers/CrmUniversityDetailsMapper';
import { CrmUniversityStageFlowService } from './CrmUniversityStageFlowService';

@Injectable()
export class CrmUniversityDetailsService {
  constructor(
    private readonly db: AppDbContext,
    private readonly lookupService: CrmUniversityLookupService,
    private readonly detailsMapper: CrmUniversityDetailsMapper,
    private readonly stageFlowService: CrmUniversityStageFlowService,
  ) {}

  async getUniversityDetails(
    uniId: string,
    includeDrafts = true,
  ): Promise<CrmUniversityDetailsResponseDto> {
    const university = await this.lookupService.loadUniversityOrThrow(uniId);
    if (!includeDrafts && !university.isPublished) {
      throw new NotFoundException('University not found');
    }

    const [totalCourses, activeIntakeRows, customApplicationStageFlow] =
      await Promise.all([
        this.countCourses(uniId, includeDrafts),
        this.loadActiveIntakeMonthYears(uniId, includeDrafts),
        this.stageFlowService.getFlow(uniId),
      ]);

    const activeIntakeItems = groupActiveIntakesByQuarter(activeIntakeRows);

    return {
      success: true,
      message: 'University details retrieved successfully',
      university: this.detailsMapper.toUniversityInfo(university),
      totalCourses,
      activeIntakes: {
        count: activeIntakeItems.length,
        items: activeIntakeItems,
      },
      commission: this.detailsMapper.toCommission(university),
      customApplicationStageFlow,
      meta: this.detailsMapper.toMeta(university),
    };
  }

  private async countCourses(uniId: string, includeDrafts: boolean): Promise<number> {
    return this.db.courses.count({
      where: includeDrafts
        ? { uniId, deletedAt: IsNull() }
        : { uniId, deletedAt: IsNull(), isPublished: true },
    });
  }

  private async loadActiveIntakeMonthYears(
    uniId: string,
    includeDrafts: boolean,
  ): Promise<{ intakeYear: number; intakeMonth: number }[]> {
    const now = new Date();
    const currentKey = now.getFullYear() * 12 + (now.getMonth() + 1);

    const qb = this.db.courseIntakes
      .createQueryBuilder('intake')
      .innerJoin('intake.UniCourse', 'course')
      .select('intake.intakeYear', 'intakeYear')
      .addSelect('intake.intakeMonth', 'intakeMonth')
      .where('course.uniId = :uniId', { uniId })
      .andWhere('course.deletedAt IS NULL')
      .andWhere('intake.deletedAt IS NULL')
      .andWhere('intake.isActive = true')
      .andWhere('intake.intakeKey >= :currentKey', { currentKey });
    if (!includeDrafts) qb.andWhere('intake.isPublished = true');

    const rows = await qb
      .distinct(true)
      .orderBy('intake.intakeYear', 'ASC')
      .addOrderBy('intake.intakeMonth', 'ASC')
      .getRawMany<{ intakeYear: string | number; intakeMonth: string | number }>();

    return rows.map((r) => ({
      intakeYear: Number(r.intakeYear),
      intakeMonth: Number(r.intakeMonth),
    }));
  }
}
