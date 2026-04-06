import { MetaDataItem } from '@shared/dtos/course-details/MetaDataItem.type';
import type { CsvRow } from '../../common/abstractions/CsvImportProcessor';

/** One item in rankingMetaData: subtitle optional, description array of strings. */
export type RankingMetaDataItem = MetaDataItem;



/**
 * One university CSV row (input columns). Matches schema input headers.
 */
export interface UniversityCsvRow {
  countryName: string;
  stateName: string;
  cityName: string;
  uniName: string;
  commission: string;
  commissionType: string;
  logoUrl: string;
  website: string;
  aboutUs: string;
  address: string;
  coverImageUrl: string;
  campusLifeLinks: string;
  rankingMetaData: string;
  locationMapMetaData: string;
  establishedYear: string;
  universityType: string;
  currRanking: string;
}

/**
 * University row with resolved location and entity IDs (reviewed output).
 */
export interface ReviewedUniversityRow extends UniversityCsvRow {
  sysCountryId: string;
  sysStateId: string;
  sysCityId: string;
  id: string;
}

/**
 * University row with validation/resolution error reason (error output).
 */
export interface ErrorUniversityRow extends UniversityCsvRow {
  errorReason: string;
}

/**
 * University row with resolved location IDs, used for DB upsert in UniversityResolverService.
 * Validation guarantees rankingMetaData and locationMapMetaData are present on valid rows.
 */
export interface ResolvedUniversityRow {
  uniName: string;
  sysCountryId: string;
  sysStateId: string;
  sysCityId: string;
  commission: string;
  commissionType: string;
  logoUrl: string;
  website: string;
  aboutUs: string;
  address: string;
  coverImageUrl: string;
  campusLifeLinks: string;
  rankingMetaData:     MetaDataItem[];
  locationMapMetaData: string;  
  establishedYear?: number;
  universityType?: string;
  currRanking?: number;
}

const UNIVERSITY_CSV_KEYS: (keyof UniversityCsvRow)[] = [
  'countryName',
  'stateName',
  'cityName',
  'uniName',
  'commission',
  'commissionType',
  'logoUrl',
  'website',
  'aboutUs',
  'address',
  'coverImageUrl',
  'campusLifeLinks',
  'rankingMetaData',
  'locationMapMetaData',
  'establishedYear',
  'universityType',
  'currRanking',
];

/**
 * Normalizes a raw CSV row to UniversityCsvRow (trim strings, default empty string).
 */
export function normalizeCsvRow(row: CsvRow): UniversityCsvRow {
  const out: Record<string, string> = {};
  for (const key of UNIVERSITY_CSV_KEYS) {
    const v = row[key];
    out[key] = typeof v === 'string' ? v.trim() : '';
  }
  return out as unknown as UniversityCsvRow;
}
