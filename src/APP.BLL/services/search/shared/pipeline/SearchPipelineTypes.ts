import { SearchFiltersDto } from '@shared/dtos/search/SearchFiltersDto';
import { SearchRangesDto } from '@shared/dtos/search/SearchRangesDto';
import { SearchFlagsDto } from '@shared/dtos/search/SearchFlagsDto';
import { ListType } from '@shared/enums/ListType.enum';
import type { SearchContext } from '@shared/search/SearchTypes';

export enum SearchExecutionSource {
  HOME = 'HOME',
  NORMAL_SEARCH = 'NORMAL_SEARCH',
  ADVANCED_SEARCH = 'ADVANCED_SEARCH',
}

export interface PipelineParams {
  searchText?: string;
  filters?: SearchFiltersDto;
  ranges?: SearchRangesDto;
  flags?: SearchFlagsDto;
  cursor?: string;
  limit?: number;
  listType?: ListType | null;
  context: SearchContext;
  source?: SearchExecutionSource;
}

/** Intake window for next-intake rule (index-friendly intakeKey). */
export interface IntakeWindow {
  minYear: number;
  minMonth: number;
  maxYear: number;
  maxMonth: number;
  nowKey: number;
}

export interface SearchCandidate {
  courseIntakeId: string;
  rankScore: number;
  isEligible: boolean | null;
}

export interface SearchCandidateQuery {
  getCandidates(params: PipelineParams): Promise<SearchCandidate[]>;
}
