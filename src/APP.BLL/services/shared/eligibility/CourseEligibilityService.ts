import { Injectable } from '@nestjs/common';
import { UniCourses } from '@entity/entities/UniCourses.entity';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { CourseEngReq } from '@entity/entities/CourseEngReq.entity';
import type {
  CourseEligibilityResult,
  NormalizedEligibilityProfile,
} from '@shared/eligibility/EligibilityTypes';
import { ValidationException } from '@shared/exceptions/ValidationException';

function parseCourseDecimal(value?: string | null): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

@Injectable()
export class CourseEligibilityService {
  checkEligibility(
    input: {
      course?: UniCourses;
      courseIntake?: UniCourseIntakes;
    },
    profile: NormalizedEligibilityProfile,
  ): CourseEligibilityResult {
    const course = input.course ?? input.courseIntake?.UniCourse;
    if (!course) {
      throw new ValidationException('Eligibility check requires a course');
    }

    const reasons: string[] = [];

    const { isAcademicEligible, academicReasons } = this.evaluateAcademic(
      course,
      profile,
    );
    reasons.push(...academicReasons);

    const { isEnglishEligible, englishReasons } = this.evaluateEnglish(
      course,
      profile,
    );
    reasons.push(...englishReasons);

    return {
      isEligible: isAcademicEligible && isEnglishEligible,
      isAcademicEligible,
      isEnglishEligible,
      reasons,
    };
  }

  private evaluateAcademic(
    course: UniCourses,
    profile: NormalizedEligibilityProfile,
  ): { isAcademicEligible: boolean; academicReasons: string[] } {
    const academicReasons: string[] = [];

    if (!course.minSysDegreeId) {
      return { isAcademicEligible: true, academicReasons };
    }

    const minOk = this.passesDegreeWithGpa(
      profile,
      course.minSysDegreeId,
      course.minGpa,
    );

    if (minOk) {
      return { isAcademicEligible: true, academicReasons };
    }

    if (course.higherSysDegreeId) {
      const higherOk = this.passesDegreeWithGpa(
        profile,
        course.higherSysDegreeId,
        course.higherGpa,
      );
      if (higherOk) {
        return { isAcademicEligible: true, academicReasons };
      }
    }

    academicReasons.push(
      'Lead academic record does not meet this course minimum or alternate higher-degree requirement',
    );
    return { isAcademicEligible: false, academicReasons };
  }

  private passesDegreeWithGpa(
    profile: NormalizedEligibilityProfile,
    degreeId: string,
    minGpaStr?: string | null,
  ): boolean {
    const row = profile.academicResultsByDegreeId.get(degreeId);
    if (!row) {
      return false;
    }

    const minGpa = parseCourseDecimal(minGpaStr);
    if (minGpa === undefined) {
      return true;
    }

    const gpa = row.gpa;
    if (gpa === undefined) {
      return false;
    }

    return gpa >= minGpa;
  }

  private evaluateEnglish(
    course: UniCourses,
    profile: NormalizedEligibilityProfile,
  ): { isEnglishEligible: boolean; englishReasons: string[] } {
    const englishReasons: string[] = [];
    const reqs = course.CourseEngReq ?? [];

    if (reqs.length === 0) {
      return { isEnglishEligible: true, englishReasons };
    }

    for (const req of reqs) {
      if (this.englishRequirementRowSatisfied(req, profile)) {
        return { isEnglishEligible: true, englishReasons };
      }
    }

    englishReasons.push(
      'Lead English test scores do not satisfy any configured course English requirement',
    );
    return { isEnglishEligible: false, englishReasons };
  }

  private englishRequirementRowSatisfied(
    req: CourseEngReq,
    profile: NormalizedEligibilityProfile,
  ): boolean {
    const lead = profile.englishResultsByTestId.get(req.sysEngTestId);
    if (!lead) {
      return false;
    }

    const minOverall = parseCourseDecimal(req.minOverallReq);
    if (minOverall !== undefined && lead.overallScore < minOverall) {
      return false;
    }

    const minSection = parseCourseDecimal(req.minSectionReq);
    const catalog = req.SysEnglishTest?.SysEnglishTestSection ?? [];

    if (minSection === undefined) {
      return true;
    }

    for (const section of catalog) {
      const score = lead.sectionScores.find(
        (s) => s.sectionId === section.id,
      )?.score;
      if (score === undefined || score < minSection) {
        return false;
      }
    }

    return true;
  }
}
