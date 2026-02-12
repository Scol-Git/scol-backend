import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder, Brackets } from 'typeorm';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { SearchFiltersDto } from '@shared/dtos/search/SearchFiltersDto';
import { SearchRangesDto } from '@shared/dtos/search/SearchRangesDto';
import { SearchFlagsDto } from '@shared/dtos/search/SearchFlagsDto';

/**
 * Applies filters, ranges, and flags to search queries
 *
 * Used for Normal Search and Advanced Search.
 * All filters are applied STRICTLY (no matches = no results).
 *
 * Note: Sorting is handled by the ranking system, not user-defined.
 */
@Injectable()
export class SearchFilterService {
  /**
   * Apply text search across course name, university, country
   */
  applyTextSearch(
    query: SelectQueryBuilder<UniCourseIntakes>,
    searchText: string,
  ): SelectQueryBuilder<UniCourseIntakes> {
    if (!searchText?.trim()) {
      return query;
    }

    const pattern = `%${searchText.trim()}%`;

    return query.andWhere(
      new Brackets((qb) => {
        qb.where('course.courseName ILIKE :searchPattern', {
          searchPattern: pattern,
        })
          .orWhere('uni.uniName ILIKE :searchPattern', {
            searchPattern: pattern,
          })
          .orWhere('country.name ILIKE :searchPattern', {
            searchPattern: pattern,
          });
      }),
    );
  }

  /**
   * Apply ID-based filters strictly
   */
  applyFilters(
    query: SelectQueryBuilder<UniCourseIntakes>,
    filters?: SearchFiltersDto,
  ): SelectQueryBuilder<UniCourseIntakes> {
    if (!filters) {
      return query;
    }

    // Country filter
    if (filters.countryIds?.length) {
      query.andWhere('uni.sysCountryId IN (:...countryIds)', {
        countryIds: filters.countryIds,
      });
    }

    // City filter
    if (filters.cityIds?.length) {
      query.andWhere('uni.sysCityId IN (:...cityIds)', {
        cityIds: filters.cityIds,
      });
    }

    // Programme filter
    if (filters.programmeIds?.length) {
      query.andWhere('course.sysProgrammeId IN (:...programmeIds)', {
        programmeIds: filters.programmeIds,
      });
    }

    // Intake filter (month range)
    const intake = filters.intake;
    if (
      intake?.year != null &&
      intake.fromMonth != null &&
      intake.toMonth != null
    ) {
      const fromKey = intake.year * 12 + intake.fromMonth;
      const toKey = intake.year * 12 + intake.toMonth;

      query.andWhere('courseIntake.intakeKey BETWEEN :fromKey AND :toKey', {
        fromKey,
        toKey,
      });
    }

    return query;
  }

  /**
   * Apply range filters
   */
  applyRanges(
    query: SelectQueryBuilder<UniCourseIntakes>,
    ranges?: SearchRangesDto,
  ): SelectQueryBuilder<UniCourseIntakes> {
    if (!ranges) {
      return query;
    }

    // Tuition fee range
    if (ranges.tuitionFee?.min !== undefined) {
      query.andWhere(
        'CAST(courseIntake.tuitionFee AS DECIMAL) >= :minTuitionFee',
        { minTuitionFee: ranges.tuitionFee.min },
      );
    }
    if (ranges.tuitionFee?.max !== undefined) {
      query.andWhere(
        'CAST(courseIntake.tuitionFee AS DECIMAL) <= :maxTuitionFee',
        { maxTuitionFee: ranges.tuitionFee.max },
      );
    }

    // Duration range
    if (ranges.durationMonths?.min !== undefined) {
      query.andWhere('courseIntake.courseDuration >= :minDuration', {
        minDuration: ranges.durationMonths.min,
      });
    }
    if (ranges.durationMonths?.max !== undefined) {
      query.andWhere('courseIntake.courseDuration <= :maxDuration', {
        maxDuration: ranges.durationMonths.max,
      });
    }

    return query;
  }

  /**
   * Apply boolean flag filters
   */
  applyFlags(
    query: SelectQueryBuilder<UniCourseIntakes>,
    flags?: SearchFlagsDto,
  ): SelectQueryBuilder<UniCourseIntakes> {
    if (!flags) {
      return query;
    }

    // Scholarship filter
    if (flags.hasScholarship === true) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM "CourseIntakeScholarships" sch 
          WHERE sch."courseIntakeId" = courseIntake.id 
          AND sch."isActive" = true
        )`,
      );
    }

    return query;
  }
}
