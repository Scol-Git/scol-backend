import { Injectable } from '@nestjs/common';
import { LeadFavouriteCourses } from '@entity/entities/LeadFavouriteCourses.entity';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import {
  EnglishRequirementDto,
  IntakeDto,
  UniversityDto,
} from '@shared/dtos/search/CourseResultDto';
import { WishlistItemDto } from '@shared/dtos/wishlists/WishlistItemDto';

const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

/**
 * Maps a `LeadFavouriteCourses` row (with the standard course-detail relation
 * graph hydrated) into a `WishlistItemDto`.
 *
 * Uses the same shape contract as `CourseResponseMapper.toCourseResultDto` so
 * `GET /wishlists` items are field-identical to home/search items minus the
 * (redundant) `isWishlisted` flag.
 */
@Injectable()
export class WishlistMapper {
  toWishlistItem(fav: LeadFavouriteCourses): WishlistItemDto {
    return this.intakeToWishlistItem(fav.UniCourseIntake);
  }

  private intakeToWishlistItem(intake: UniCourseIntakes): WishlistItemDto {
    const course = intake.UniCourse;
    const university = course?.SysUniversity;
    const scholarships = intake.CourseIntakeScholarship ?? [];
    const engReqs = course?.CourseEngReq ?? [];

    return {
      courseId: intake.id,
      courseName: course?.courseName ?? '',
      university: this.toUniversityDto(university),
      imgUrl: university?.coverImageUrl ?? null,
      intake: this.toIntakeDto(intake.intakeMonth, intake.intakeYear),
      tuitionFee:
        intake.tuitionFee != null ? parseFloat(intake.tuitionFee) : null,
      currency: intake.currency ?? null,
      durationMonths: intake.courseDuration ?? null,
      initialDeposit:
        intake.initialDeposit != null
          ? parseFloat(intake.initialDeposit)
          : null,
      applicationFee:
        intake.applicationFee != null
          ? parseFloat(intake.applicationFee)
          : null,
      isScholarshipAvailable: scholarships.length > 0,
      engRequirements: this.toEnglishRequirements(engReqs),
    };
  }

  private toUniversityDto(university?: {
    id: string;
    uniName: string;
    SysCountry?: { countryName: string };
    SysState?: { stateName: string };
    SysCity?: { cityName: string };
    logoUrl?: string;
    coverImageUrl?: string;
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

  private toIntakeDto(intakeMonth: number, intakeYear: number): IntakeDto {
    const monthName = MONTH_NAMES[intakeMonth - 1] ?? 'UNK';
    return {
      name: `${monthName} ${intakeYear}`,
      year: intakeYear,
    };
  }

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
