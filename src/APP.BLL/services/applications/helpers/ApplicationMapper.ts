import { Injectable } from '@nestjs/common';
import { Applications } from '@entity/entities/Applications.entity';
import { CreateApplicationResponseDto } from '@shared/dtos/applications/CreateApplicationResponseDto';
import { ApplicationListItemDto } from '@shared/dtos/applications/ApplicationListItemDto';
import { GetApplicationsResponseDto } from '@shared/dtos/applications/GetApplicationsResponseDto';

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

@Injectable()
export class ApplicationMapper {
  toCreateApplicationResponse(
    applicationId: string,
  ): CreateApplicationResponseDto {
    return {
      success: true,
      applicationId,
    };
  }

  toApplicationListItem(application: Applications): ApplicationListItemDto {
    const intake = application.UniCourseIntake;
    const course = intake?.UniCourse;
    const university = course?.SysUniversity;
    const stage = application.CurrentSysApplicationStage;
    const status = application.CurrentSysApplicationStatus;

    if (!intake || !course || !university || !stage || !status) {
      throw new Error(
        'Application list mapping failed: required relations not loaded',
      );
    }

    return {
      applicationId: application.id,
      applicationOverview: {
        universityInfo: {
          universityId: university.id,
          universityName: university.uniName,
          universityLogoUrl: university.logoUrl ?? null,
          universityCoverImageUrl: university.coverImageUrl ?? null,
        },
        courseInfo: {
          courseId: course.id,
          courseName: course.courseName,
        },
        intakeInfo: {
          intakeId: intake.id,
          intakeName: this.formatIntakeName(
            intake.intakeMonth,
            intake.intakeYear,
          ),
        },
        currentStage: {
          stageCode: stage.stageCode,
          stageName: stage.stageName ?? stage.stageCode,
        },
        currentStatus: {
          statusCode: status.statusCode,
          statusName: status.statusName ?? status.statusCode,
        },
        lastUpdatedAt: application.updatedAt.toISOString(),
      },
    };
  }

  toGetApplicationsResponse(
    items: ApplicationListItemDto[],
  ): GetApplicationsResponseDto {
    return { applications: items };
  }

  private formatIntakeName(intakeMonth: number, intakeYear: number): string {
    const idx = intakeMonth - 1;
    const monthName =
      idx >= 0 && idx < MONTH_NAMES_EN.length
        ? MONTH_NAMES_EN[idx]
        : `Month ${intakeMonth}`;
    return `${monthName} ${intakeYear}`;
  }
}
