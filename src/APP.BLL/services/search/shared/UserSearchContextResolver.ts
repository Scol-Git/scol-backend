import { Injectable, Inject } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ICurrentUser } from '@shared/interfaces/domain';
import { UserState } from '@shared/enums/UserState.enum';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';
import { RankingMode } from '@shared/enums/RankingMode.enum';
import { ICacheService as ICacheToken } from '@shared/tokens/injection.tokens';
import type { ICacheService } from '@shared/interfaces/infrastructure';
import {
  SearchContext,
  LeadProfileData,
  LeadProfileNormalizer,
  ANONYMOUS_SEARCH_CONTEXT,
} from '@shared/search/SearchTypes';
import { SearchCacheKeyBuilder } from './cache/SearchCacheKeyBuilder';
import { ILogger } from '@shared/interfaces';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/**
 * Cacheable context (without Maps/Sets that don't survive JSON serialization)
 */
interface CacheableContext {
  userState: UserState;
  academicFormStatus: AcademicFormStatus;
  rankingMode: RankingMode;
  /** Raw profile data (JSON-serializable) - normalized after cache retrieval */
  leadProfileData?: LeadProfileData;
}

/**
 * Resolves user search context
 *
 * Determines:
 * - User authentication state
 * - Academic form completion status
 * - Appropriate ranking mode
 * - Lead profile data for eligibility calculations
 *
 * **Optimizations:**
 * - Redis caching with 2-minute TTL (reduces DB queries)
 * - Pre-normalized profile data (eliminates repeated parseFloat calls)
 * - Fail-open caching (works without Redis)
 *
 * **Cache Strategy:**
 * - Caches raw LeadProfileData (JSON-serializable)
 * - Normalizes to Map/Set AFTER cache retrieval (Maps/Sets don't survive JSON)
 *
 * **Cache Invalidation:**
 * - Call `invalidateUserContext(userId)` when user profile changes
 * - Cache auto-expires after 2 minutes
 */
@Injectable()
export class UserSearchContextResolver {
  constructor(
    private readonly db: AppDbContext,
    @Inject(ICacheToken)
    private readonly cache: ICacheService,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  /**
   * Resolve the complete search context for a user
   *
   * Cached for 2 minutes to reduce database queries.
   * Returns immediately for anonymous users (no cache needed).
   *
   * @param user - Current user (undefined for anonymous)
   */
  async resolve(user?: ICurrentUser): Promise<SearchContext> {
    // Anonymous user - no caching needed
    if (!user) {
      return ANONYMOUS_SEARCH_CONTEXT;
    }

    // Try to get cacheable context from cache
    const cacheKey = SearchCacheKeyBuilder.forUserContext(user.userId);

    const cachedContext = await this.cache.getOrSet<CacheableContext>(
      cacheKey,
      () => this.resolveFromDatabase(user.userId),
      SearchCacheKeyBuilder.TTL.USER_CONTEXT,
    );

    // Convert cacheable context to full SearchContext with normalized profile
    return this.toSearchContext(cachedContext);
  }

  /**
   * Convert cacheable context to SearchContext
   * Normalizes the profile data to Maps/Sets (which don't survive JSON serialization)
   */
  private toSearchContext(cached: CacheableContext): SearchContext {
    // No profile data = no normalization needed
    if (!cached.leadProfileData) {
      return {
        userState: cached.userState,
        academicFormStatus: cached.academicFormStatus,
        rankingMode: cached.rankingMode,
        normalizedProfile: undefined,
      };
    }

    // Normalize the raw profile data to Maps/Sets
    const normalizedProfile = LeadProfileNormalizer.normalize(
      cached.leadProfileData,
    );

    return {
      userState: cached.userState,
      academicFormStatus: cached.academicFormStatus,
      rankingMode: cached.rankingMode,
      normalizedProfile,
    };
  }

  /**
   * Invalidate cached user context
   *
   * Call this when user profile changes (academic results, preferences, etc.)
   *
   * @param userId - User ID to invalidate
   */
  async invalidateUserContext(userId: string): Promise<void> {
    const cacheKey = SearchCacheKeyBuilder.forUserContext(userId);
    await this.cache.remove(cacheKey);
  }

  /**
   * Resolve cacheable context from database
   * Returns raw LeadProfileData (JSON-serializable) instead of normalized Maps/Sets
   */
  private async resolveFromDatabase(userId: string): Promise<CacheableContext> {
    // Load lead profile with all academic data
    const leadProfile = await this.db.leadProfiles.findOne({
      where: { userId },
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

    // No profile = treat as anonymous (BUSINESS_ONLY mode)
    if (!leadProfile) {
      return {
        userState: UserState.LOGGED_IN,
        academicFormStatus: AcademicFormStatus.INCOMPLETE,
        rankingMode: RankingMode.BUSINESS_ONLY,
        leadProfileData: undefined,
      };
    }

    // Determine form status
    const formStatus = this.determineFormStatus(leadProfile);
    const rankingMode = this.determineRankingMode(formStatus);

    // If form is incomplete (no data), treat same as "no profile"
    if (formStatus === AcademicFormStatus.INCOMPLETE) {
      return {
        userState: UserState.LOGGED_IN,
        academicFormStatus: formStatus,
        rankingMode,
        leadProfileData: undefined,
      };
    }

    // Map to profile data (raw, JSON-serializable)
    const leadProfileData = this.mapToLeadProfileData(leadProfile);

    this.logger.LogDebug('Lead profile data (cacheable)', {
      leadId: leadProfileData.leadId,
      academicResultsCount: leadProfileData.academicResults.length,
      englishTestsCount: leadProfileData.englishTestResults.length,
      preferredCountriesCount: leadProfileData.preferredCountryIds.length,
      preferredProgrammesCount: leadProfileData.preferredProgrammeIds.length,
    });

    return {
      userState: UserState.LOGGED_IN,
      academicFormStatus: formStatus,
      rankingMode,
      leadProfileData,
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
