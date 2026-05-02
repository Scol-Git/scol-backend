import { SearchCacheKeyBuilder } from './SearchCacheKeyBuilder';
import { ListType } from '@shared/enums/ListType.enum';
import { RankingMode } from '@shared/enums/RankingMode.enum';
import { UserState } from '@shared/enums/UserState.enum';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';
import type { SearchContext } from '@shared/search/SearchTypes';

function personalizedContext(
  overrides: Partial<{
    leadId: string;
    academic: Map<string, { degreeId: string; gpa: number }>;
    english: Map<
      string,
      {
        testId: string;
        overallScore: number;
        sectionScores: { sectionId: string; score: number }[];
      }
    >;
    countries: Set<string>;
    programmes: Set<string>;
  }> = {},
): SearchContext {
  const leadId = overrides.leadId ?? 'lead-1';
  const academicResultsByDegreeId =
    overrides.academic ??
    new Map([
      ['deg-1', { degreeId: 'deg-1', gpa: 3.5 }],
      ['deg-2', { degreeId: 'deg-2', gpa: 3.0 }],
    ]);
  const englishResultsByTestId =
    overrides.english ??
    new Map([
      [
        'test-1',
        {
          testId: 'test-1',
          overallScore: 7,
          sectionScores: [
            { sectionId: 's-b', score: 6 },
            { sectionId: 's-a', score: 7 },
          ],
        },
      ],
    ]);
  const preferredCountryIds = overrides.countries ?? new Set(['c2', 'c1']);
  const preferredProgrammeIds = overrides.programmes ?? new Set(['p1']);

  return {
    userState: UserState.LOGGED_IN,
    academicFormStatus: AcademicFormStatus.COMPLETED,
    rankingMode: RankingMode.ELIGIBILITY_PLUS_BUSINESS,
    normalizedProfile: {
      leadId,
      academicResultsByDegreeId,
      englishResultsByTestId,
      preferredCountryIds,
      preferredProgrammeIds,
    },
  };
}

describe('SearchCacheKeyBuilder', () => {
  const baseParams = {
    searchText: 'Engineering',
    listType: ListType.ELIGIBLE_ONLY,
    rankingMode: RankingMode.BUSINESS_ONLY,
    limit: 15,
  };

  it('returns GLOBAL scope for anonymous BUSINESS_ONLY context', () => {
    const ctx: SearchContext = {
      userState: UserState.NOT_LOGGED_IN,
      academicFormStatus: AcademicFormStatus.INCOMPLETE,
      rankingMode: RankingMode.BUSINESS_ONLY,
      normalizedProfile: undefined,
    };
    const uc = SearchCacheKeyBuilder.fromSearchContext(ctx);
    expect(uc).toEqual({
      scope: 'GLOBAL',
      rankingMode: RankingMode.BUSINESS_ONLY,
    });
  });

  it('matches anonymous and logged-in incomplete BUSINESS_ONLY search result keys', () => {
    const anon: SearchContext = {
      userState: UserState.NOT_LOGGED_IN,
      academicFormStatus: AcademicFormStatus.INCOMPLETE,
      rankingMode: RankingMode.BUSINESS_ONLY,
      normalizedProfile: undefined,
    };
    const incomplete: SearchContext = {
      userState: UserState.LOGGED_IN,
      academicFormStatus: AcademicFormStatus.INCOMPLETE,
      rankingMode: RankingMode.BUSINESS_ONLY,
      normalizedProfile: undefined,
    };
    const a = SearchCacheKeyBuilder.forSearchResults({
      userContext: SearchCacheKeyBuilder.fromSearchContext(anon),
      ...baseParams,
    });
    const b = SearchCacheKeyBuilder.forSearchResults({
      userContext: SearchCacheKeyBuilder.fromSearchContext(incomplete),
      ...baseParams,
    });
    expect(a).toBe(b);
  });

  it('returns USER scope for personalized context', () => {
    const uc = SearchCacheKeyBuilder.fromSearchContext(personalizedContext());
    expect(uc.scope).toBe('USER');
    expect(uc.rankingMode).toBe(RankingMode.ELIGIBILITY_PLUS_BUSINESS);
    expect(uc.leadId).toBe('lead-1');
  });

  it('changes key when academic profile data changes', () => {
    const personalizedParams = {
      searchText: 'Engineering',
      listType: ListType.ELIGIBLE_ONLY,
      rankingMode: RankingMode.ELIGIBILITY_PLUS_BUSINESS,
      limit: 15,
    };
    const k1 = SearchCacheKeyBuilder.forSearchResults({
      userContext: SearchCacheKeyBuilder.fromSearchContext(
        personalizedContext(),
      ),
      ...personalizedParams,
    });
    const k2 = SearchCacheKeyBuilder.forSearchResults({
      userContext: SearchCacheKeyBuilder.fromSearchContext(
        personalizedContext({
          academic: new Map([['deg-1', { degreeId: 'deg-1', gpa: 4.0 }]]),
        }),
      ),
      ...personalizedParams,
    });
    expect(k1).not.toBe(k2);
  });

  it('produces deterministic keys (sorted arrays)', () => {
    const personalizedParams = {
      searchText: 'Engineering',
      listType: ListType.ELIGIBLE_ONLY,
      rankingMode: RankingMode.ELIGIBILITY_PLUS_BUSINESS,
      limit: 15,
    };
    const ctx = personalizedContext();
    const k1 = SearchCacheKeyBuilder.forSearchResults({
      userContext: SearchCacheKeyBuilder.fromSearchContext(ctx),
      ...personalizedParams,
    });
    const k2 = SearchCacheKeyBuilder.forSearchResults({
      userContext: SearchCacheKeyBuilder.fromSearchContext(
        personalizedContext(),
      ),
      ...personalizedParams,
    });
    expect(k1).toBe(k2);
  });
});
