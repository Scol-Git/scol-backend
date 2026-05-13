import { Injectable, NotFoundException } from '@nestjs/common';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { CreateApplicationRequestDto } from '@shared/dtos/applications/CreateApplicationRequestDto';
import { ValidationException } from '@shared/exceptions/ValidationException';
import type { NormalizedEligibilityProfile } from '@shared/eligibility/EligibilityTypes';
import { ApplicationAccessService } from './ApplicationAccessService';
import { EligibilityLoader } from '@bll/services/shared/eligibility/EligibilityLoader';
import { EligibilityProfileBuilder } from '@bll/services/shared/eligibility/EligibilityProfileBuilder';
import { CourseEligibilityService } from '@bll/services/shared/eligibility/CourseEligibilityService';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';

export interface CreateApplicationContext {
  leadId: string;
  courseIntake: UniCourseIntakes;
  countryId: string;
}

@Injectable()
export class ApplicationCreationContextService {
  constructor(
    private readonly db: AppDbContext,
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

    return this.resolveCreateContextForLeadOrThrow(lead.id, dto);
  }

  async resolveCreateContextForLeadOrThrow(
    leadId: string,
    dto: CreateApplicationRequestDto,
  ): Promise<CreateApplicationContext> {
    const lead = await this.loadLeadProfileByIdOrThrow(leadId);

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
    await this.ensureApplicationDoesNotExistOrThrow(leadId, courseIntake);

    const countryId = this.resolveCountryIdOrThrow(courseIntake);

    return {
      leadId: lead.id,
      courseIntake,
      countryId,
    };
  }

  private async loadLeadProfileByIdOrThrow(
    leadId: string,
  ): Promise<SysLeadProfiles> {
    const leadProfile = await this.db.leadProfiles.findOne({
      where: { id: leadId },
    });

    if (!leadProfile) {
      throw new NotFoundException('Lead profile not found');
    }

    return leadProfile;
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

  private async ensureApplicationDoesNotExistOrThrow(
    leadId: string,
    courseIntake: UniCourseIntakes,
  ): Promise<void> {
    const application = await this.db.applications.findOne({
      where: { leadId, courseIntakeId: courseIntake.id },
    });

    if (application) {
      throw new ValidationException(
        'Lead has already applied for this course intake',
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
