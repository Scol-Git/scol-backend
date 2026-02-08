import { createHash } from 'crypto';
import { SearchFiltersDto } from '@shared/dtos/search/SearchFiltersDto';
import { SearchRangesDto } from '@shared/dtos/search/SearchRangesDto';
import { SearchFlagsDto } from '@shared/dtos/search/SearchFlagsDto';
import { ListType } from '@shared/enums/ListType.enum';
import { RankingMode } from '@shared/enums/RankingMode.enum';
import { UserState } from '@shared/enums/UserState.enum';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';
import type { SearchContext } from '@shared/search/SearchTypes';

/**
 * Search-specific cache key builder
 *
 * Provides standardized, deterministic cache keys for search operations.
 * Keys are designed to be:
 * - Unique per search configuration
 * - Deterministic (same params = same key)
 * - Namespaced to prevent collisions
 *
 * **Cache Domains:**
 * - `search:results` - Cached search result pages
 * - `search:context` - Cached user search contexts
 * - `search:filters` - Cached filter option lists
 *
 * **TTL Guidelines:**
 * - Search results: 5 minutes (balances freshness vs performance)
 * - User context: 2 minutes (profile changes should reflect quickly)
 * - Filter options: 30 minutes (reference data changes rarely)
 */
export class SearchCacheKeyBuilder {
  /** Application prefix for all search cache keys */
  private static readonly PREFIX = 'scol:search';

  /** Cache domains */
  private static readonly DOMAINS = {
    RESULTS: 'results',
    CONTEXT: 'context',
    FILTERS: 'filters',
  } as const;

  /** TTL values in seconds */
  static readonly TTL = {
    /** Search results cache: 5 minutes */
    SEARCH_RESULTS: 300,
    /** User context cache: 2 minutes */
    USER_CONTEXT: 120,
    /** Filter options cache: 30 minutes */
    FILTER_OPTIONS: 1800,
  } as const;

  // =========================================================================
  // Search Results Keys
  // =========================================================================

  /**
   * Build cache key for search results
   *
   * Key includes hash of all search parameters to ensure uniqueness.
   * Different ranking modes get different cache entries.
   *
   * @param params - Search parameters
   * @returns Cache key string
   */
  static forSearchResults(params: SearchResultsKeyParams): string {
    const hash = this.hashSearchParams(params);
    return `${this.PREFIX}:${this.DOMAINS.RESULTS}:${params.rankingMode}:${hash}`;
  }

  /**
   * Build cache-relevant user context from SearchContext.
   * Converts Maps/Sets to sorted arrays for deterministic cache key hashing.
   */
  static fromSearchContext(context: SearchContext): CacheRelevantUserContext {
    const base = {
      userState: context.userState,
      academicFormStatus: context.academicFormStatus,
      rankingMode: context.rankingMode,
    };
    const profile = context.normalizedProfile;
    if (!profile) {
      return base;
    }
    const academicResults = Array.from(profile.academicResultsByDegreeId.entries())
      .map(([degreeId, r]) => ({ degreeId, gpa: r.gpa }))
      .sort((a, b) => a.degreeId.localeCompare(b.degreeId));
    const englishResults = Array.from(profile.englishResultsByTestId.entries())
      .map(([testId, r]) => ({
        testId,
        overallScore: r.overallScore,
        sectionScores: r.sectionScores.map((s) => ({
          sectionId: s.sectionId,
          score: s.score,
        })),
      }))
      .sort((a, b) => a.testId.localeCompare(b.testId));
    const preferredCountryIds = Array.from(profile.preferredCountryIds).sort();
    const preferredProgrammeIds = Array.from(profile.preferredProgrammeIds).sort();
    return {
      ...base,
      leadId: profile.leadId,
      academicResults,
      englishResults,
      preferredCountryIds,
      preferredProgrammeIds,
    };
  }

  /**
   * Generate deterministic hash from search parameters
   *
   * Uses SHA-256 truncated to 16 chars for balance of:
   * - Uniqueness (16^16 = 18 quintillion possibilities)
   * - Key length (keeps Redis memory efficient)
   */
  private static hashSearchParams(params: SearchResultsKeyParams): string {
    // Normalize and sort for deterministic output
    const normalized = {
      // Full user context: identity + all profile data that affects ranking/eligibility
      uc: params.userContext,
      // Text search (lowercase for case-insensitive matching)
      t: params.searchText?.toLowerCase().trim() || null,
      // Filters (sorted for determinism)
      f: params.filters
        ? {
            c: params.filters.countryIds?.sort() || null,
            ci: params.filters.cityIds?.sort() || null,
            p: params.filters.programmeIds?.sort() || null,
            i: params.filters.intakeIds?.sort() || null,
            y: params.filters.intakeYear ?? null,
          }
        : null,
      // Ranges
      r: params.ranges
        ? {
            tf: params.ranges.tuitionFee || null,
            dm: params.ranges.durationMonths || null,
          }
        : null,
      // Flags
      fl: params.flags
        ? {
            hs: params.flags.hasScholarship ?? null,
          }
        : null,
      // List type
      lt: params.listType,
      // Pagination cursor (each page has different cache entry)
      cur: params.cursor || null,
      // Limit
      lim: params.limit ?? 15,
    };

    const json = JSON.stringify(normalized);
    return createHash('sha256').update(json).digest('hex').slice(0, 16);
  }

  // =========================================================================
  // User Context Keys
  // =========================================================================

  /**
   * Build cache key for user search context
   *
   * @param userId - User ID
   * @returns Cache key string
   */
  static forUserContext(userId: string): string {
    return `${this.PREFIX}:${this.DOMAINS.CONTEXT}:${userId}`;
  }

  // =========================================================================
  // Filter Options Keys
  // =========================================================================

  /**
   * Build cache key for filter options (countries, cities, etc.)
   *
   * @param filterType - Type of filter options
   * @returns Cache key string
   */
  static forFilterOptions(
    filterType: 'countries' | 'cities' | 'programmes' | 'intakes',
  ): string {
    return `${this.PREFIX}:${this.DOMAINS.FILTERS}:${filterType}`;
  }

  // =========================================================================
  // Cache Invalidation Helpers
  // =========================================================================

  /**
   * Get prefix for invalidating all search results
   * Use with cache.clearByPrefix()
   */
  static getSearchResultsPrefix(): string {
    return `${this.PREFIX}:${this.DOMAINS.RESULTS}:`;
  }

  /**
   * Get prefix for invalidating all user contexts
   * Use with cache.clearByPrefix()
   */
  static getUserContextPrefix(): string {
    return `${this.PREFIX}:${this.DOMAINS.CONTEXT}:`;
  }

  /**
   * Get prefix for invalidating all filter options
   * Use with cache.clearByPrefix()
   */
  static getFilterOptionsPrefix(): string {
    return `${this.PREFIX}:${this.DOMAINS.FILTERS}:`;
  }
}

/**
 * Serializable user context for cache key.
 * Includes everything that affects search results (ranking/eligibility).
 * Anonymous: userState, academicFormStatus, rankingMode only.
 * Logged-in with profile: plus leadId and profile data (sorted arrays for deterministic hash).
 */
export interface CacheRelevantUserContext {
  userState: UserState;
  academicFormStatus: AcademicFormStatus;
  rankingMode: RankingMode;
  /** Set when user has a profile (logged-in, form complete or partial) */
  leadId?: string | null;
  /** Academic results sorted by degreeId for deterministic hash */
  academicResults?: Array<{ degreeId: string; gpa: number }>;
  /** English results sorted by testId for deterministic hash */
  englishResults?: Array<{
    testId: string;
    overallScore: number;
    sectionScores: Array<{ sectionId: string; score: number }>;
  }>;
  /** Sorted for deterministic hash */
  preferredCountryIds?: string[];
  /** Sorted for deterministic hash */
  preferredProgrammeIds?: string[];
}

/**
 * Parameters for building search results cache key
 */
export interface SearchResultsKeyParams {
  /** Full user context so cached results are per-user and invalidate when profile/form changes */
  userContext: CacheRelevantUserContext;
  /** Search text (optional) */
  searchText?: string;
  /** Filters (optional) */
  filters?: SearchFiltersDto;
  /** Range filters (optional) */
  ranges?: SearchRangesDto;
  /** Boolean flags (optional) */
  flags?: SearchFlagsDto;
  /** List type filter */
  listType: ListType;
  /** Ranking mode (affects results even with same params) */
  rankingMode: RankingMode;
  /** Pagination cursor (optional) */
  cursor?: string;
  /** Page limit */
  limit?: number;
}
