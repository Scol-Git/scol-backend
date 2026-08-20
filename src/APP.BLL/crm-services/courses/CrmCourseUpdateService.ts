import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { UniCourses } from '@entity/entities/UniCourses.entity';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { applyDefinedFields } from '@shared/utils/PartialUpdateUtil';
import {
  COURSE_UPDATABLE_FIELDS,
  INTAKE_UPDATABLE_FIELDS,
  type UpdateCrmCourseRequestDto,
} from '@shared/dtos/crm/courses/UpdateCrmCourseRequestDto';
import type { UpdateCrmCourseResponseDto } from '@shared/dtos/crm/courses/UpdateCrmCourseResponseDto';
import { CrmCourseLookupService } from './helpers/CrmCourseLookupService';
import { CrmCourseValidationService } from './helpers/CrmCourseValidationService';

type IntakePatch = {
  intakeMonth?: number;
  intakeYear?: number;
  courseDuration?: number | null;
  applicationDeadline?: Date | null;
  tuitionFee?: string | null;
  currency?: string | null;
  initialDeposit?: string | null;
  initialDepositType?: string | null;
  applicationFee?: string | null;
  isActive?: boolean;
  intakeMetaData?: UpdateCrmCourseRequestDto['intakeMetaData'];
  feesMetaData?: UpdateCrmCourseRequestDto['feesMetaData'];
  scholarshipMetaData?: UpdateCrmCourseRequestDto['scholarshipMetaData'];
};

@Injectable()
export class CrmCourseUpdateService {
  constructor(
    private readonly db: AppDbContext,
    private readonly lookupService: CrmCourseLookupService,
    private readonly validationService: CrmCourseValidationService,
  ) {}

  /**
   * @param courseIntakeId - UniCourseIntakes.id (exposed as courseId on the API)
   */
  async updateCourse(
    courseIntakeId: string,
    dto: UpdateCrmCourseRequestDto,
  ): Promise<UpdateCrmCourseResponseDto> {
    const intake =
      await this.lookupService.loadIntakeWithCourseOrThrow(courseIntakeId);
    const course = intake.UniCourse;

    await this.validationService.validateUpdate(intake, course, dto);

    await this.db.transaction(async (manager) => {
      const courseRepo = manager.getRepository(UniCourses);
      const intakeRepo = manager.getRepository(UniCourseIntakes);

      const courseChanged = applyDefinedFields(
        course,
        dto,
        COURSE_UPDATABLE_FIELDS,
      );
      const intakePatch = this.buildIntakePatch(dto);
      const intakeChanged = applyDefinedFields(
        intake,
        intakePatch,
        INTAKE_UPDATABLE_FIELDS,
      );

      if (courseChanged) {
        await courseRepo.save(course);
      }
      if (intakeChanged) {
        await intakeRepo.save(intake);
      }
    });

    return {
      success: true,
      message: 'Course updated successfully',
    };
  }

  private buildIntakePatch(dto: UpdateCrmCourseRequestDto): IntakePatch {
    const patch: IntakePatch = {};

    if (dto.intakeMonth !== undefined) patch.intakeMonth = dto.intakeMonth;
    if (dto.intakeYear !== undefined) patch.intakeYear = dto.intakeYear;
    if (dto.courseDuration !== undefined)
      patch.courseDuration = dto.courseDuration;
    if (dto.tuitionFee !== undefined) patch.tuitionFee = dto.tuitionFee;
    if (dto.currency !== undefined) patch.currency = dto.currency;
    if (dto.initialDeposit !== undefined)
      patch.initialDeposit = dto.initialDeposit;
    if (dto.initialDepositType !== undefined)
      patch.initialDepositType = dto.initialDepositType;
    if (dto.applicationFee !== undefined)
      patch.applicationFee = dto.applicationFee;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.intakeMetaData !== undefined)
      patch.intakeMetaData = dto.intakeMetaData;
    if (dto.feesMetaData !== undefined) patch.feesMetaData = dto.feesMetaData;
    if (dto.scholarshipMetaData !== undefined)
      patch.scholarshipMetaData = dto.scholarshipMetaData;

    if (dto.applicationDeadline !== undefined) {
      patch.applicationDeadline =
        dto.applicationDeadline == null
          ? null
          : new Date(dto.applicationDeadline);
    }

    return patch;
  }
}
