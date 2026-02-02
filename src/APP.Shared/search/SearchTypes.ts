import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { LeadAcademicResults } from '@entity/entities/LeadAcademicResults.entity';
import { LeadEnglishTestResults } from '@entity/entities/LeadEnglishTestResults.entity';
import { UserState } from '@shared/enums/UserState.enum';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';
import { RankingMode } from '@shared/enums/RankingMode.enum';

// ============================================================================
// Original Types (kept for backward compatibility)
// ============================================================================

/**
 * Lead profile data for eligibility and ranking calculations
 */
export interface LeadProfileData {
  readonly leadId: string;
  readonly academicResults: LeadAcademicResults[];
  readonly englishTestResults: LeadEnglishTestResults[];
  readonly preferredCountryIds: string[];
  readonly preferredProgrammeIds: string[];
}

/**
 * Search context containing user state and ranking mode
 */
export interface SearchContext {
  readonly userState: UserState;
  readonly academicFormStatus: AcademicFormStatus;
  readonly rankingMode: RankingMode;
  /** Normalized profile for O(1) lookups in ranking/eligibility */
  readonly normalizedProfile?: NormalizedLeadProfile;
}

// ============================================================================
// Normalized Types (Pre-parsed for performance)
// ============================================================================

/**
 * Pre-parsed academic result for O(1) lookups
 * Avoids repeated parseFloat() calls during ranking/eligibility checks
 */
export interface NormalizedAcademicResult {
  readonly degreeId: string;
  readonly gpa: number; // Pre-parsed from string
}

/**
 * Pre-parsed English test section score
 */
export interface NormalizedSectionScore {
  readonly sectionId: string;
  readonly score: number; // Pre-parsed from string
}

/**
 * Pre-parsed English test result with section scores
 */
export interface NormalizedEnglishTestResult {
  readonly testId: string;
  readonly overallScore: number; // Pre-parsed from string
  readonly sectionScores: NormalizedSectionScore[];
}

/**
 * Fully normalized lead profile with:
 * - Pre-parsed numeric values (no parseFloat in loops)
 * - Set-based lookups for preferences (O(1) instead of O(n))
 * - Indexed academic results by degree ID (O(1) lookup)
 * - Indexed English results by test ID (O(1) lookup)
 */
export interface NormalizedLeadProfile {
  readonly leadId: string;

  /** Academic results indexed by degreeId for O(1) lookup */
  readonly academicResultsByDegreeId: Map<string, NormalizedAcademicResult>;

  /** English test results indexed by testId for O(1) lookup */
  readonly englishResultsByTestId: Map<string, NormalizedEnglishTestResult>;

  /** Preferred country IDs as Set for O(1) membership check */
  readonly preferredCountryIds: Set<string>;

  /** Preferred programme IDs as Set for O(1) membership check */
  readonly preferredProgrammeIds: Set<string>;
}

/**
 * Utility class to normalize lead profile data
 * Call once when resolving user context, not in every loop iteration
 */
export class LeadProfileNormalizer {
  /**
   * Normalize a lead profile for optimized lookups
   * @param profile - Raw lead profile data
   * @returns Normalized profile with pre-parsed values and indexed collections
   */
  static normalize(profile: LeadProfileData): NormalizedLeadProfile {
    // Index academic results by degree ID
    const academicResultsByDegreeId = new Map<string, NormalizedAcademicResult>();
    for (const result of profile.academicResults) {
      academicResultsByDegreeId.set(result.degreeId, {
        degreeId: result.degreeId,
        gpa: result.gpa ? parseFloat(result.gpa as unknown as string) : 0,
      });
    }

    // Index English test results by test ID
    const englishResultsByTestId = new Map<string, NormalizedEnglishTestResult>();
    for (const result of profile.englishTestResults) {
      const sectionScores: NormalizedSectionScore[] = (
        result.LeadEnglishTestSectionResult ?? []
      ).map((section) => ({
        sectionId: section.sysEngTestSectionId,
        score: section.sectionScore
          ? parseFloat(section.sectionScore as unknown as string)
          : 0,
      }));

      englishResultsByTestId.set(result.sysEngTestId, {
        testId: result.sysEngTestId,
        overallScore: result.overallScore
          ? parseFloat(result.overallScore as unknown as string)
          : 0,
        sectionScores,
      });
    }

    return {
      leadId: profile.leadId,
      academicResultsByDegreeId,
      englishResultsByTestId,
      preferredCountryIds: new Set(profile.preferredCountryIds),
      preferredProgrammeIds: new Set(profile.preferredProgrammeIds),
    };
  }
}

/**
 * Course with calculated rank score and eligibility
 */
export interface RankedCourse {
  readonly courseIntake: UniCourseIntakes;
  rankScore: number;
  isEligible: boolean;
  eligibilityDetails?: EligibilityDetails;
}

/**
 * Detailed eligibility breakdown
 */
export interface EligibilityDetails {
  readonly academicEligible: boolean;
  readonly englishEligible: boolean;
  readonly reasons: string[];
}

/**
 * Cursor data for pagination
 */
export interface CursorData {
  readonly rankScore: number;
  readonly courseIntakeId: string;
}

/**
 * Paginated result with cursor
 */
export interface PaginatedResult<T> {
  readonly items: T[];
  readonly cursor: string | null;
  readonly hasNext: boolean;
  readonly limit: number;
}

/**
 * Anonymous search context (for not logged in users)
 */
export const ANONYMOUS_SEARCH_CONTEXT: SearchContext = {
  userState: UserState.NOT_LOGGED_IN,
  academicFormStatus: AcademicFormStatus.INCOMPLETE,
  rankingMode: RankingMode.BUSINESS_ONLY,
  normalizedProfile: undefined,
};
