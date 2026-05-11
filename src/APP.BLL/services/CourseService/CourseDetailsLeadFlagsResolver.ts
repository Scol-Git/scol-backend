import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import type { ICurrentUser } from '@shared/interfaces/domain';
import { EligibilityProfileBuilder } from '@bll/services/shared/eligibility/EligibilityProfileBuilder';
import { CourseEligibilityService } from '@bll/services/shared/eligibility/CourseEligibilityService';

export interface CourseDetailsLeadFlags {
  canApply: boolean;
  alreadyApplied: boolean;
}

const DEFAULT_FLAGS: CourseDetailsLeadFlags = {
  canApply: false,
  alreadyApplied: false,
};

@Injectable()
export class CourseDetailsLeadFlagsResolver {
  constructor(
    private readonly db: AppDbContext,
    private readonly eligibilityProfileBuilder: EligibilityProfileBuilder,
    private readonly courseEligibilityService: CourseEligibilityService,
  ) {}

  async resolve(
    intake: UniCourseIntakes,
    user?: ICurrentUser,
  ): Promise<CourseDetailsLeadFlags> {
    if (!user?.userId) {
      return DEFAULT_FLAGS;
    }

    const lead = await this.db.leadProfiles.findOne({
      where: {
        userId: user.userId,
        deletedAt: IsNull(),
      },
      select: {
        id: true,
      },
    });

    if (!lead) {
      return DEFAULT_FLAGS;
    }

    const [profile, alreadyApplied] = await Promise.all([
      this.eligibilityProfileBuilder.buildForLeadOrThrow(lead.id),
      this.hasLeadAlreadyApplied(lead.id, intake.id),
    ]);

    const eligibilityResult = this.courseEligibilityService.checkEligibility(
      { courseIntake: intake },
      profile,
    );

    return {
      alreadyApplied,
      canApply: eligibilityResult.isEligible && !alreadyApplied,
    };
  }

  private async hasLeadAlreadyApplied(
    leadId: string,
    courseIntakeId: string,
  ): Promise<boolean> {
    const count = await this.db.applications.count({
      where: {
        leadId,
        courseIntakeId,
        deletedAt: IsNull(),
      },
    });

    return count > 0;
  }
}
