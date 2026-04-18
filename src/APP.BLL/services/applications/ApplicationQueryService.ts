import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { GetApplicationsResponseDto } from '@shared/dtos/applications/GetApplicationsResponseDto';
import { ApplicationAccessService } from './helpers/ApplicationAccessService';
import { ApplicationMapper } from './helpers/ApplicationMapper';

@Injectable()
export class ApplicationQueryService {
  constructor(
    private readonly db: AppDbContext,
    private readonly applicationAccessService: ApplicationAccessService,
    private readonly mapper: ApplicationMapper,
  ) {}

  async getLeadApplications(
    currentUserId: string,
  ): Promise<GetApplicationsResponseDto> {
    const lead =
      await this.applicationAccessService.ensureLeadProfileExistsOrThrow(
        currentUserId,
      );

    const applications = await this.db.applications.find({
      where: { leadId: lead.id },
      relations: [
        'UniCourseIntake',
        'UniCourseIntake.UniCourse',
        'UniCourseIntake.UniCourse.SysUniversity',
        'CurrentSysApplicationStage',
        'CurrentSysApplicationStatus',
      ],
      order: { updatedAt: 'DESC' },
    });

    const items = applications.map((app) =>
      this.mapper.toApplicationListItem(app),
    );

    return this.mapper.toGetApplicationsResponse(items);
  }
}
