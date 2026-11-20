import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { dmyToIso } from '@shared/utils/dmyDate';
import type { UpdateIntakeFeesRequestDto } from '@shared/dtos/crm/universities/UpdateIntakeFeesRequestDto';
import type {
  UniversityIntakePeriodDto,
  UpdateIntakeFeesResponseDto,
} from '@shared/dtos/crm/universities/UniversityIntakePeriodDto';

@Injectable()
export class CrmUniversityIntakeFeesService {
  constructor(private readonly db: AppDbContext) {}

  async listIntakes(uniId: string): Promise<UniversityIntakePeriodDto[]> {
    await this.requirePublishedUniversity(uniId);
    const rows = await this.db.courseIntakes
      .createQueryBuilder('intake')
      .innerJoin('intake.UniCourse', 'course')
      .select('intake.intakeMonth', 'intakeMonth')
      .addSelect('intake.intakeYear', 'intakeYear')
      .addSelect('COUNT(*)::int', 'courseCount')
      .where('course.uniId = :uniId', { uniId })
      .andWhere('course.deletedAt IS NULL')
      .andWhere('intake.deletedAt IS NULL')
      .groupBy('intake.intakeMonth')
      .addGroupBy('intake.intakeYear')
      .orderBy('intake.intakeYear', 'ASC')
      .addOrderBy('intake.intakeMonth', 'ASC')
      .getRawMany<{ intakeMonth: number; intakeYear: number; courseCount: number }>();

    return rows.map((row) => ({
      intakeMonth: Number(row.intakeMonth),
      intakeYear: Number(row.intakeYear),
      courseCount: Number(row.courseCount),
    }));
  }

  async updateFees(
    uniId: string,
    dto: UpdateIntakeFeesRequestDto,
  ): Promise<UpdateIntakeFeesResponseDto> {
    await this.requirePublishedUniversity(uniId);

    const patch: Record<string, string | null> = {};
    if (dto.applicationDeadline !== undefined) {
      patch.applicationDeadline =
        dto.applicationDeadline == null ? null : dmyToIso(dto.applicationDeadline);
    }
    if (dto.applicationFee !== undefined) {
      patch.applicationFee = dto.applicationFee ?? null;
    }

    const result = await this.db.courseIntakes
      .createQueryBuilder()
      .update(UniCourseIntakes)
      .set(patch as QueryDeepPartialEntity<UniCourseIntakes>)
      .where(
        `"uniCourseId" IN (SELECT id FROM "UniCourses" WHERE "uniId" = :uniId AND "deletedAt" IS NULL)`,
        { uniId },
      )
      .andWhere('"intakeMonth" = :intakeMonth', { intakeMonth: dto.intakeMonth })
      .andWhere('"intakeYear" = :intakeYear', { intakeYear: dto.intakeYear })
      .andWhere('"deletedAt" IS NULL')
      .execute();

    return { updatedCount: result.affected ?? 0 };
  }

  private async requirePublishedUniversity(uniId: string): Promise<void> {
    const university = await this.db.universities.findOne({
      where: { id: uniId, deletedAt: IsNull() },
    });
    if (!university) throw new NotFoundException('University not found');
    if (!university.isPublished) {
      throw new ValidationException('University is not published', {
        uniId: ['Select a published university'],
      });
    }
  }
}
