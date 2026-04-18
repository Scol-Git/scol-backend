import { Injectable } from '@nestjs/common';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { CreateApplicationRequestDto } from '@shared/dtos/applications/CreateApplicationRequestDto';
import { ValidationException } from '@shared/exceptions/ValidationException';
import type { NormalizedEligibilityProfile } from '@shared/eligibility/EligibilityTypes';
import { ApplicationAccessService } from './ApplicationAccessService';
import { EligibilityLoader } from '@bll/services/shared/eligibility/EligibilityLoader';
import { EligibilityProfileBuilder } from '@bll/services/shared/eligibility/EligibilityProfileBuilder';
import { CourseEligibilityService } from '@bll/services/shared/eligibility/CourseEligibilityService';

export interface CreateApplicationContext {
  leadId: string;
  courseIntake: UniCourseIntakes;
  countryId: string;
}

@Injectable()
export class ApplicationCreationContextService {
  constructor(
    private readonly applicationAccessService: ApplicationAccessService,
    private readonly eligibilityLoader: EligibilityLoader,
    private readonly eligibilityProfileBuilder: EligibilityProfileBuilder,
    private readonly courseEligibility: CourseEligibilityService,
  ) {}

  async resolveCreateContextOrThrow(
    currentUserId: string,
    dto: CreateApplicationRequestDto,
  ): Promise<CreateApplicationContext> {
    const lead =
      await this.applicationAccessService.ensureLeadProfileExistsOrThrow(
        currentUserId,
      );

    const courseIntake =
      await this.eligibilityLoader.loadCourseIntakeBySelectionOrThrow(
        dto.universityId,
        dto.courseId,
        dto.intake.intakeMonth,
        dto.intake.intakeYear,
      );

    const profile = await this.eligibilityProfileBuilder.buildForLeadOrThrow(
      lead.id,
    );

    this.ensureEligibleForSelectedCourseOrThrow(courseIntake, profile);

    const countryId = this.resolveCountryIdOrThrow(courseIntake);

    return {
      leadId: lead.id,
      courseIntake,
      countryId,
    };
  }

  private ensureEligibleForSelectedCourseOrThrow(
    courseIntake: UniCourseIntakes,
    profile: NormalizedEligibilityProfile,
  ): void {
    const result = this.courseEligibility.checkEligibility(
      { courseIntake },
      profile,
    );

    if (!result.isEligible) {
      throw new ValidationException(
        'Lead is not eligible for the selected course',
        { eligibility: result.reasons },
      );
    }
  }

  private resolveCountryIdOrThrow(courseIntake: UniCourseIntakes): string {
    const countryId = courseIntake.UniCourse?.SysUniversity?.sysCountryId;
    if (!countryId) {
      throw new ValidationException(
        'Unable to resolve country for selected intake',
      );
    }
    return countryId;
  }
}
