import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseDetailsLoader } from '@bll/services/CourseService/CourseDetailsLoader';
import { CourseDetailsMapper } from '@bll/mappings/course-details/CourseDetailsMapper';
import type { CrmCourseDetailsResponseDto } from '@shared/dtos/crm/courses/CrmCourseDetailsResponseDto';
import { isoToDmy } from '@shared/utils/dmyDate';

@Injectable()
export class CrmCourseDetailsService {
  constructor(
    private readonly courseDetailsLoader: CourseDetailsLoader,
    private readonly courseDetailsMapper: CourseDetailsMapper,
  ) {}

  /**
   * @param courseIntakeId - UniCourseIntakes.id (exposed as courseId on the API)
   */
  async getCourseDetails(
    courseIntakeId: string,
    includeDrafts = true,
  ): Promise<CrmCourseDetailsResponseDto> {
    const intake =
      await this.courseDetailsLoader.loadActiveIntakeOrNull(courseIntakeId, includeDrafts);

    if (!intake) {
      throw new NotFoundException('Course not found');
    }

    const currentYearIntakes =
      await this.courseDetailsLoader.loadCurrentYearIntakes(
        intake.uniCourseId,
        includeDrafts,
      );

    const mapped = this.courseDetailsMapper.toCrmCourseDetailsResponse(
      intake,
      currentYearIntakes,
    );

    const course = intake.UniCourse;
    const scholarship = (intake.CourseIntakeScholarship ?? []).find((row) => row.isActive) ?? null;

    return {
      success: true,
      message: 'Course details retrieved successfully',
      courseDetails: {
        ...mapped.courseDetails,
        programmeName: course?.SysProgramme?.name ?? null,
      },
      meta: mapped.meta,
      publish: {
        intakeIsPublished: intake.isPublished,
        courseIsPublished: course?.isPublished ?? true,
        universityIsPublished: course?.SysUniversity?.isPublished ?? true,
        importBatchId: intake.importBatchId ?? null,
      },
      edit: {
        sysProgrammeId: course?.sysProgrammeId ?? null,
        minSysDegreeId: course?.minSysDegreeId ?? null,
        higherSysDegreeId: course?.higherSysDegreeId ?? null,
        externalUrl: course?.externalUrl ?? null,
        courseDuration: intake.courseDuration ?? null,
        applicationDeadline: isoToDmy(intake.applicationDeadline),
        scholarshipName: scholarship?.name ?? null,
        scholarshipType: scholarship?.amountType ?? null,
        scholarshipAmount: scholarship?.amount ?? null,
        scholarshipMetaData: intake.scholarshipMetaData ?? null,
        requirementMetaData: course?.requirementMetaData ?? null,
        feesMetaData: intake.feesMetaData ?? null,
        intakeMetaData: intake.intakeMetaData ?? null,
      },
    };
  }
}
