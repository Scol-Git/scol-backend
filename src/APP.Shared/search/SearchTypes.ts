import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { LeadAcademicResults } from '@entity/entities/LeadAcademicResults.entity';
import { LeadEnglishTestResults } from '@entity/entities/LeadEnglishTestResults.entity';
import { UserState } from '@shared/enums/UserState.enum';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';
import { RankingMode } from '@shared/enums/RankingMode.enum';

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
  readonly leadProfile?: LeadProfileData;
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
  leadProfile: undefined,
};
