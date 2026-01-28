import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ICurrentUser } from '@shared/interfaces/domain';
import { UserState } from '@shared/enums/UserState.enum';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';
import { RankingMode } from '@shared/enums/RankingMode.enum';
import {
  SearchContext,
  LeadProfileData,
  ANONYMOUS_SEARCH_CONTEXT,
} from '@shared/search/SearchTypes';

/**
 * Resolves user search context
 *
 * Determines:
 * - User authentication state
 * - Academic form completion status
 * - Appropriate ranking mode
 * - Lead profile data for eligibility calculations
 */
@Injectable()
export class UserSearchContextResolver {
  constructor(private readonly db: AppDbContext) {}

  /**
   * Resolve the complete search context for a user
   * @param user - Current user (undefined for anonymous)
   */
  async resolve(user?: ICurrentUser): Promise<SearchContext> {
    // Anonymous user
    if (!user) {
      return ANONYMOUS_SEARCH_CONTEXT;
    }

    // Load lead profile with all academic data
    const leadProfile = await this.db.leadProfiles.findOne({
      where: { userId: user.userId },
      relations: {
        LeadAcademicResult: { SysAcademicDegree: true },
        LeadEnglishTestResult: {
          SysEnglishTest: true,
          LeadEnglishTestSectionResult: { SysEnglishTestSection: true },
        },
        LeadPreferredCountry: true,
        LeadPreferredProgram: true,
      },
    });

    // No profile = anonymous user
    if (!leadProfile) {
      return ANONYMOUS_SEARCH_CONTEXT;
    }

    // Determine form status
    const formStatus = this.determineFormStatus(leadProfile);
    const rankingMode = this.determineRankingMode(formStatus);

    // If form is incomplete (no data), treat same as "no profile"
    // No need to pass empty arrays for eligibility calculations
    const leadProfileData =
      formStatus === AcademicFormStatus.INCOMPLETE
        ? undefined
        : this.mapToLeadProfileData(leadProfile);

    return {
      userState: UserState.LOGGED_IN,
      academicFormStatus: formStatus,
      rankingMode,
      leadProfile: leadProfileData,
    };
  }

  /**
   * Determine form completion status based on filled fields
   */
  private determineFormStatus(profile: {
    LeadAcademicResult?: unknown[];
    LeadEnglishTestResult?: unknown[];
  }): AcademicFormStatus {
    const hasAcademic = (profile.LeadAcademicResult?.length ?? 0) > 0;
    const hasEnglishTest = (profile.LeadEnglishTestResult?.length ?? 0) > 0;
    const fields = [hasAcademic, hasEnglishTest];
    const filledCount = fields.filter(Boolean).length;

    if (filledCount === 0) return AcademicFormStatus.INCOMPLETE;
    if (filledCount === fields.length) return AcademicFormStatus.COMPLETED;
    return AcademicFormStatus.PARTIALLY_COMPLETED;
  }

  /**
   * Determine ranking mode based on form status
   */
  private determineRankingMode(formStatus: AcademicFormStatus): RankingMode {
    if (
      formStatus === AcademicFormStatus.COMPLETED ||
      formStatus === AcademicFormStatus.PARTIALLY_COMPLETED
    ) {
      return RankingMode.ELIGIBILITY_PLUS_BUSINESS;
    }
    return RankingMode.BUSINESS_ONLY;
  }

  /**
   * Map lead profile entity to LeadProfileData
   */
  private mapToLeadProfileData(profile: {
    id: string;
    LeadAcademicResult?: { degreeId: string; degree?: unknown }[];
    LeadEnglishTestResult?: { sysEngTestId: string }[];
    LeadPreferredCountry?: { countryId: string }[];
    LeadPreferredProgram?: { programmeId: string }[];
  }): LeadProfileData {
    return {
      leadId: profile.id,
      academicResults: (profile.LeadAcademicResult ??
        []) as LeadProfileData['academicResults'],
      englishTestResults: (profile.LeadEnglishTestResult ??
        []) as LeadProfileData['englishTestResults'],
      preferredCountryIds: (profile.LeadPreferredCountry ?? []).map(
        (p) => p.countryId,
      ),
      preferredProgrammeIds: (profile.LeadPreferredProgram ?? []).map(
        (p) => p.programmeId,
      ),
    };
  }
}
