import { Injectable } from '@nestjs/common';
import {
  RankedCourse,
  SearchContext,
  PaginatedResult,
} from '@shared/search/SearchTypes';
import { SearchResponseDto } from '@shared/dtos/search/SearchResponseDto';
import {
  CourseResultDto,
  UniversityDto,
  IntakeDto,
  EnglishRequirementDto,
} from '@shared/dtos/search/CourseResultDto';
import { CursorPaginationResponseDto } from '@shared/dtos/search/CursorPaginationDto';
import { ListType } from '@shared/enums/ListType.enum';
import { UniIntakes } from '@entity/entities/UniIntakes.entity';

/**
 * Maps course entities to response DTOs
 */
@Injectable()
export class CourseResponseMapper {
  /**
   * Map to SearchResponseDto
   */
  toSearchResponse(
    context: SearchContext,
    paginated: PaginatedResult<RankedCourse>,
    listType: ListType,
  ): SearchResponseDto {
    return {
      userState: context.userState,
      academicFormStatus: context.academicFormStatus,
      listType,
      pagination: this.toPaginationResponse(paginated),
      courses: paginated.items.map((rc) => this.toCourseResultDto(rc)),
    };
  }

  /**
   * Map to empty SearchResponseDto
   */
  toEmptyResponse(
    context: SearchContext,
    listType: ListType,
  ): SearchResponseDto {
    return {
      userState: context.userState,
      academicFormStatus: context.academicFormStatus,
      listType,
      pagination: {
        cursor: null,
        limit: 15,
        hasNext: false,
      },
      courses: [],
    };
  }

  /**
   * Map to pagination response
   */
  private toPaginationResponse(
    paginated: PaginatedResult<RankedCourse>,
  ): CursorPaginationResponseDto {
    return {
      cursor: paginated.cursor,
      limit: paginated.limit,
      hasNext: paginated.hasNext,
    };
  }

  /**
   * Map RankedCourse to CourseResultDto
   */
  private toCourseResultDto(rankedCourse: RankedCourse): CourseResultDto {
    const courseIntake = rankedCourse.courseIntake;
    const course = courseIntake.UniCourse;
    const university = course?.SysUniversity;
    const uniIntake = courseIntake.UniIntake;
    const scholarships = courseIntake.CourseIntakeScholarship ?? [];
    const engReqs = course?.CourseEngReq ?? [];

    return {
      courseId: courseIntake.id,
      courseName: course?.courseName ?? '',
      university: this.toUniversityDto(university),
      imgUrl: university?.coverImageUrl ?? null,
      intake: this.toIntakeDto(uniIntake, courseIntake.intakeYear),
      tuitionFee:
        courseIntake.tuitionFee != null
          ? parseFloat(courseIntake.tuitionFee)
          : null,
      currency: courseIntake.currency ?? null,
      durationMonths: courseIntake.courseDuration ?? null,
      initialDeposit:
        courseIntake.initialDeposit != null
          ? parseFloat(courseIntake.initialDeposit)
          : null,
      applicationFee:
        courseIntake.applicationFee != null
          ? parseFloat(courseIntake.applicationFee)
          : null,
      isScholarshipAvailable: scholarships.length > 0,
      engRequirements: this.toEnglishRequirements(engReqs),
      isWishlisted: false, // TODO: Implement wishlist check
    };
  }

  /**
   * Map to UniversityDto
   */
  private toUniversityDto(university?: {
    id: string;
    uniName: string;
    SysCountry?: { countryName: string };
    SysState?: { stateName: string };
    SysCity?: { cityName: string };
    logoUrl?: string;
    coverImageUrl?: string;
    commission?: string;
    commissionType?: string;
  }): UniversityDto {
    return {
      id: university?.id ?? '',
      name: university?.uniName ?? '',
      country: university?.SysCountry?.countryName ?? '',
      state: university?.SysState?.stateName,
      city: university?.SysCity?.cityName,
      logoUrl: university?.logoUrl,
      imgUrl: university?.coverImageUrl,
    };
  }

  /**
   * Map to IntakeDto
   */
  private toIntakeDto(uniIntake?: UniIntakes, intakeYear?: number): IntakeDto {
    const intakeName =
      uniIntake?.intakeName ?? uniIntake?.SysIntake?.name ?? 'Unknown';
    return {
      name: intakeYear ? `${intakeName} ${intakeYear}` : intakeName,
      year: intakeYear ?? new Date().getFullYear(),
    };
  }
  /**
   * Map to EnglishRequirementDto list
   */
  private toEnglishRequirements(
    engReqs: Array<{
      minOverallReq?: string;
      minSectionReq?: string;
      SysEnglishTest?: { testName?: string };
    }>,
  ): EnglishRequirementDto[] | undefined {
    const requirements = engReqs
      .filter((req) => !!req.minOverallReq)
      .map((req) => ({
        testName: req.SysEnglishTest?.testName ?? '',
        overall: parseFloat(req.minOverallReq!),
        section: req.minSectionReq ? parseFloat(req.minSectionReq) : undefined,
      }))
      .filter((req) => req.testName);

    return requirements.length > 0 ? requirements : undefined;
  }
}
