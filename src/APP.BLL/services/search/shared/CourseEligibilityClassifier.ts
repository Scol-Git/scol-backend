import { Injectable } from '@nestjs/common';
import {
  SearchContext,
  RankedCourse,
  LeadProfileData,
  EligibilityDetails,
} from '@shared/search/SearchTypes';

/**
 * Classifies courses by eligibility
 *
 * Does NOT filter courses - only adds eligibility flags.
 * Classification is based on academic and English requirements.
 */
@Injectable()
export class CourseEligibilityClassifier {
  /**
   * Classify ranked courses by eligibility
   * @param rankedCourses - Courses to classify
   * @param context - Search context with user profile
   * @returns Courses with eligibility flags set
   */
  classify(
    rankedCourses: RankedCourse[],
    context: SearchContext,
  ): RankedCourse[] {
    // No profile = cannot determine eligibility, treat all as eligible
    if (!context.leadProfile) {
      return rankedCourses.map((rc) => ({
        ...rc,
        isEligible: true,
        eligibilityDetails: undefined,
      }));
    }

    return rankedCourses.map((rc) => {
      const details = this.checkEligibility(
        rc.courseIntake,
        context.leadProfile!,
      );
      return {
        ...rc,
        isEligible: details.academicEligible && details.englishEligible,
        eligibilityDetails: details,
      };
    });
  }

  /**
   * Check eligibility for a single course
   */
  private checkEligibility(
    courseIntake: RankedCourse['courseIntake'],
    profile: LeadProfileData,
  ): EligibilityDetails {
    const reasons: string[] = [];

    const academicEligible = this.checkAcademicEligibility(
      courseIntake,
      profile,
      reasons,
    );

    const englishEligible = this.checkEnglishEligibility(
      courseIntake,
      profile,
      reasons,
    );

    return { academicEligible, englishEligible, reasons };
  }

  /**
   * Check academic eligibility
   */
  private checkAcademicEligibility(
    courseIntake: RankedCourse['courseIntake'],
    profile: LeadProfileData,
    reasons: string[],
  ): boolean {
    const course = courseIntake.UniCourse;

    // No academic requirement = eligible
    if (!course?.minSysDegreeId) {
      return true;
    }

    // No academic results = not eligible
    if (profile.academicResults.length === 0) {
      reasons.push('No academic qualifications provided');
      return false;
    }

    const minDegreeResult = profile.academicResults.find(
      (r) => r.degreeId === course.minSysDegreeId,
    );
    const minGpaRequired = course.minGpa
      ? parseFloat(course.minGpa)
      : undefined;

    const minGpaValue = minDegreeResult?.gpa
      ? parseFloat(minDegreeResult.gpa)
      : undefined;

    const meetsMinGpa =
      minGpaRequired === undefined ||
      (minGpaValue !== undefined && minGpaValue >= minGpaRequired);

    // If minimum degree + GPA meet, eligible
    if (minDegreeResult && meetsMinGpa) {
      return true;
    }

    // If minimum not met, try higher degree + higher GPA (if configured)
    if (course.higherSysDegreeId) {
      const higherDegreeResult = profile.academicResults.find(
        (r) => r.degreeId === course.higherSysDegreeId,
      );
      const higherGpaRequired = course.higherGpa
        ? parseFloat(course.higherGpa)
        : undefined;
      const higherGpaValue = higherDegreeResult?.gpa
        ? parseFloat(higherDegreeResult.gpa)
        : undefined;
      const meetsHigherGpa =
        higherGpaRequired === undefined ||
        (higherGpaValue !== undefined && higherGpaValue >= higherGpaRequired);

      if (higherDegreeResult && meetsHigherGpa) {
        return true;
      }
    }

    if (!minDegreeResult) {
      reasons.push(
        `Requires ${course.minSysAcademicDegree?.degreeName ?? 'required degree'}`,
      );
      return false;
    }

    if (course.minGpa && minGpaValue === undefined) {
      reasons.push('GPA not provided for required degree');
      return false;
    }

    if (course.minGpa && minGpaValue !== undefined && !meetsMinGpa) {
      reasons.push(`Requires minimum GPA of ${course.minGpa}`);
      return false;
    }

    reasons.push('Does not meet higher degree requirements');
    return false;
  }

  /**
   * Check English test eligibility
   */
  private checkEnglishEligibility(
    courseIntake: RankedCourse['courseIntake'],
    profile: LeadProfileData,
    reasons: string[],
  ): boolean {
    const engReqs = (courseIntake.UniCourse?.CourseEngReq ?? []) as Array<{
      sysEngTestId: string;
      minOverallReq?: string | null;
      minSectionReq?: string | null;
      SysEnglishTest?: { testName?: string };
    }>;

    // No English requirement = eligible
    if (engReqs.length === 0) {
      return true;
    }

    // No test results = not eligible
    if (profile.englishTestResults.length === 0) {
      reasons.push('No English test results provided');
      return false;
    }

    // Check if ANY requirement is met
    const meetsAnyRequirement = engReqs.some((req) => {
      const matchingTest = profile.englishTestResults.find(
        (t) => t.sysEngTestId === req.sysEngTestId,
      );

      if (!matchingTest?.overallScore) {
        return false;
      }

      const leadScore = parseFloat(matchingTest.overallScore);
      const requiredScore = parseFloat(req.minOverallReq ?? '0');

      if (leadScore < requiredScore) {
        return false;
      }

      // Check section requirements if applicable
      if (req.minSectionReq) {
        const requiredSection = parseFloat(req.minSectionReq);
        const sections = matchingTest.LeadEnglishTestSectionResult ?? [];

        const allSectionsMet = sections.every(
          (s) => parseFloat(s.sectionScore ?? '0') >= requiredSection,
        );

        if (!allSectionsMet) {
          return false;
        }
      }

      return true;
    });

    if (!meetsAnyRequirement) {
      const testNames = engReqs
        .map((r) => r.SysEnglishTest?.testName)
        .filter(Boolean)
        .join(' or ');
      reasons.push(`Does not meet ${testNames || 'English'} requirements`);
    }

    return meetsAnyRequirement;
  }
}
