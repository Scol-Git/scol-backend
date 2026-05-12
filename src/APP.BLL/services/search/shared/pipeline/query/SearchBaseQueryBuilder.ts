import { Injectable } from '@nestjs/common';
import { DataSource, SelectQueryBuilder, Brackets } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import type { IntakeWindow, PipelineParams } from '../SearchPipelineTypes';

@Injectable()
export class SearchBaseQueryBuilder {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  shouldApplyNextIntakeRule(params: PipelineParams): boolean {
    const intake = params.filters?.intake;
    return (
      !intake ||
      intake.year == null ||
      intake.fromMonth == null ||
      intake.toMonth == null
    );
  }

  computeIntakeWindow(): IntakeWindow {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    return {
      minYear: currentYear,
      minMonth: currentMonth,
      maxYear: 0,
      maxMonth: 0,
      nowKey: currentYear * 12 + currentMonth,
    };
  }

  buildBaseQuery(
    params: PipelineParams,
    intakeWindow: IntakeWindow,
  ): SelectQueryBuilder<UniCourseIntakes> {
    let qb = this.dataSource
      .createQueryBuilder(UniCourseIntakes, 'ci')
      .innerJoin('ci.UniCourse', 'course')
      .innerJoin('course.SysUniversity', 'uni')
      .innerJoin('uni.SysCountry', 'country')
      .where('ci.isActive = true');

    qb = this.applySearchTextFilter(qb, params);
    qb = this.applyLocationFilters(qb, params);
    qb = this.applyProgrammeFilter(qb, params);
    qb = this.applyIntakeFilters(qb, params);
    qb = this.applyScholarshipFlag(qb, params);

    if (this.shouldApplyNextIntakeRule(params)) {
      qb = this.applyNextIntakeWindow(qb, intakeWindow);
    }

    return qb;
  }

  applyNextIntakeWindow(
    qb: SelectQueryBuilder<UniCourseIntakes>,
    intakeWindow: IntakeWindow,
  ): SelectQueryBuilder<UniCourseIntakes> {
    qb.andWhere('ci.intakeKey >= :currentKey', {
      currentKey: intakeWindow.nowKey,
    });
    return qb;
  }

  applySearchTextFilter(
    qb: SelectQueryBuilder<UniCourseIntakes>,
    params: PipelineParams,
  ): SelectQueryBuilder<UniCourseIntakes> {
    if (!params.searchText?.trim()) return qb;

    const pattern = `%${params.searchText.trim()}%`;

    qb.innerJoin('course.SysProgramme', 'programme');
    qb.andWhere(
      new Brackets((sub) => {
        sub
          .where('course.courseName ILIKE :pattern', { pattern })
          .orWhere('uni.uniName ILIKE :pattern', { pattern })
          .orWhere('country.countryName ILIKE :pattern', { pattern })
          .orWhere('programme.name ILIKE :pattern', { pattern });
      }),
    );

    return qb;
  }

  applyLocationFilters(
    qb: SelectQueryBuilder<UniCourseIntakes>,
    params: PipelineParams,
  ): SelectQueryBuilder<UniCourseIntakes> {
    const f = params.filters;

    if (f?.countryIds?.length) {
      qb.andWhere('uni.sysCountryId IN (:...countryIds)', {
        countryIds: f.countryIds,
      });
    }

    if (f?.cityIds?.length) {
      qb.andWhere('uni.sysCityId IN (:...cityIds)', {
        cityIds: f.cityIds,
      });
    }

    return qb;
  }

  applyProgrammeFilter(
    qb: SelectQueryBuilder<UniCourseIntakes>,
    params: PipelineParams,
  ): SelectQueryBuilder<UniCourseIntakes> {
    const f = params.filters;

    if (f?.programmeIds?.length) {
      qb.andWhere('course.sysProgrammeId IN (:...programmeIds)', {
        programmeIds: f.programmeIds,
      });
    }

    return qb;
  }

  applyIntakeFilters(
    qb: SelectQueryBuilder<UniCourseIntakes>,
    params: PipelineParams,
  ): SelectQueryBuilder<UniCourseIntakes> {
    const intake = params.filters?.intake;

    if (
      intake?.year != null &&
      intake.fromMonth != null &&
      intake.toMonth != null
    ) {
      const fromKey = intake.year * 12 + intake.fromMonth;
      const toKey = intake.year * 12 + intake.toMonth;

      qb.andWhere('ci.intakeKey BETWEEN :fromKey AND :toKey', {
        fromKey,
        toKey,
      });
    }

    return qb;
  }

  applyScholarshipFlag(
    qb: SelectQueryBuilder<UniCourseIntakes>,
    params: PipelineParams,
  ): SelectQueryBuilder<UniCourseIntakes> {
    if (params.flags?.hasScholarship !== true) return qb;

    qb.andWhere(
      `EXISTS (
        SELECT 1 FROM "CourseIntakeScholarships" sch
        WHERE sch."courseIntakeId" = ci.id
          AND sch."isActive" = true
      )`,
    );

    return qb;
  }
}
