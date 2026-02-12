import { Injectable } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';

/**
 * Builds base TypeORM queries for course search
 *
 * Handles all necessary joins to load related entities
 * for ranking and response mapping.
 */
@Injectable()
export class CourseQueryBuilder {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Build base query with all necessary joins
   */
  buildBaseQuery(): SelectQueryBuilder<UniCourseIntakes> {
    return (
      this.dataSource
        .createQueryBuilder(UniCourseIntakes, 'courseIntake')
        // Course info
        .innerJoinAndSelect('courseIntake.UniCourse', 'course')
        // University info
        .innerJoinAndSelect('course.SysUniversity', 'uni')
        .innerJoinAndSelect('uni.SysCountry', 'country')
        .leftJoinAndSelect('uni.SysState', 'state')
        .leftJoinAndSelect('uni.SysCity', 'city')
        // Scholarships (only active)
        .leftJoinAndSelect(
          'courseIntake.CourseIntakeScholarship',
          'scholarships',
          'scholarships.isActive = :scholarshipActive',
          { scholarshipActive: true },
        )
        // English requirements (for eligibility)
        .leftJoinAndSelect('course.CourseEngReq', 'engReqs')
        .leftJoinAndSelect('engReqs.SysEnglishTest', 'engTest')
        // Minimum degree requirement (for eligibility)
        .leftJoinAndSelect('course.minSysAcademicDegree', 'minDegree')
        // Only active course intakes
        .where('courseIntake.isActive = :isActive', { isActive: true })
    );
  }

  /**
   * Apply limit to query (for initial fetch before in-memory processing)
   */
  applyLimit(
    query: SelectQueryBuilder<UniCourseIntakes>,
    limit: number,
  ): SelectQueryBuilder<UniCourseIntakes> {
    return query.take(limit);
  }

  /**
   * Apply basic ordering (for consistent results when fetching)
   */
  applyDefaultOrdering(
    query: SelectQueryBuilder<UniCourseIntakes>,
  ): SelectQueryBuilder<UniCourseIntakes> {
    return query
      .orderBy('courseIntake.createdAt', 'DESC')
      .addOrderBy('courseIntake.id', 'ASC');
  }
}
