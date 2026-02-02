import { Injectable, Inject } from '@nestjs/common';
import {
  SearchContext,
  RankedCourse,
  NormalizedLeadProfile,
  EligibilityDetails,
} from '@shared/search/SearchTypes';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/**
 * Classifies courses by eligibility
 *
 * Does NOT filter courses - only adds eligibility flags.
 * Classification is based on academic and English requirements.
 *
 * **Optimization:** Uses normalizedProfile for O(1) Map lookups
 * instead of O(n) array.find() operations. All scores are pre-parsed.
 */
@Injectable()
export class CourseEligibilityClassifier {
  constructor(@Inject(ILoggerToken) private readonly logger: ILogger) {}
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
    // No normalized profile = cannot determine eligibility, treat all as eligible
    if (!context.normalizedProfile) {
      this.logger.LogDebug('No normalized profile, treating all as eligible');
      return rankedCourses.map((rc) => ({
        ...rc,
        isEligible: true,
        eligibilityDetails: undefined,
      }));
    }

    const normalized = context.normalizedProfile;

    // Debug: Log profile summary
    this.logger.LogDebug('Eligibility check with profile', {
      academicResultsCount: normalized.academicResultsByDegreeId.size,
      englishResultsCount: normalized.englishResultsByTestId.size,
      englishTestIds: [...normalized.englishResultsByTestId.keys()],
    });

    return rankedCourses.map((rc) => {
      const details = this.checkEligibility(rc.courseIntake, normalized);
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
    profile: NormalizedLeadProfile,
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
   * Check academic eligibility using O(1) Map lookups
   */
  private checkAcademicEligibility(
    courseIntake: RankedCourse['courseIntake'],
    profile: NormalizedLeadProfile,
    reasons: string[],
  ): boolean {
    const course = courseIntake.UniCourse;

    // No academic requirement = eligible
    if (!course?.minSysDegreeId) {
      return true;
    }

    // No academic results = not eligible
    if (profile.academicResultsByDegreeId.size === 0) {
      reasons.push('No academic qualifications provided');
      return false;
    }

    // O(1) lookup for minimum degree
    const minDegreeResult = profile.academicResultsByDegreeId.get(
      course.minSysDegreeId,
    );
    const minGpaRequired = course.minGpa
      ? parseFloat(course.minGpa)
      : undefined;

    // gpa is already pre-parsed as number in normalized profile
    const minGpaValue = minDegreeResult?.gpa;

    const meetsMinGpa =
      minGpaRequired === undefined ||
      (minGpaValue !== undefined && minGpaValue >= minGpaRequired);

    // If minimum degree + GPA meet, eligible
    if (minDegreeResult && meetsMinGpa) {
      return true;
    }

    // If minimum not met, try higher degree + higher GPA (if configured)
    if (course.higherSysDegreeId) {
      // O(1) lookup for higher degree
      const higherDegreeResult = profile.academicResultsByDegreeId.get(
        course.higherSysDegreeId,
      );
      const higherGpaRequired = course.higherGpa
        ? parseFloat(course.higherGpa)
        : undefined;
      // gpa is already pre-parsed
      const higherGpaValue = higherDegreeResult?.gpa;
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
   * Check English test eligibility using O(1) Map lookups
   */
  private checkEnglishEligibility(
    courseIntake: RankedCourse['courseIntake'],
    profile: NormalizedLeadProfile,
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
    if (profile.englishResultsByTestId.size === 0) {
      reasons.push('No English test results provided');
      return false;
    }

    // Check if ANY requirement is met
    const meetsAnyRequirement = engReqs.some((req) => {
      // O(1) lookup by test ID
      const matchingTest = profile.englishResultsByTestId.get(req.sysEngTestId);

      if (!matchingTest) {
        return false;
      }

      // overallScore is already pre-parsed as number
      const requiredScore = parseFloat(req.minOverallReq ?? '0');

      if (matchingTest.overallScore < requiredScore) {
        return false;
      }

      // Check section requirements if applicable
      if (req.minSectionReq) {
        const requiredSection = parseFloat(req.minSectionReq);
        const sections = matchingTest.sectionScores;

        // Debug: Log section check
        this.logger.LogDebug('Section check', {
          testId: req.sysEngTestId,
          requiredSection,
          userSections: sections,
          sectionsLength: sections.length,
        });

        // Empty sections array cannot satisfy section requirements
        if (sections.length === 0) {
          return false; // No section data = cannot verify = ineligible
        }

        // sectionScores are already pre-parsed as numbers
        const allSectionsMet = sections.every(
          (s) => s.score >= requiredSection,
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
