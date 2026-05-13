import type { CsvImportSchema } from '../common/abstractions/CsvImportSchema';

const INPUT_HEADERS = [
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
] as const;

const REVIEWED_HEADERS = [
  ...INPUT_HEADERS,
  'sysCountryId',
  'sysStateId',
  'sysCityId',
  'id',
];

const ERROR_HEADERS = [...INPUT_HEADERS, 'errorReason'];

export const UniversityImportSchema: CsvImportSchema = {
  inputHeaders: [...INPUT_HEADERS],
  reviewedHeaders: [...REVIEWED_HEADERS],
  errorHeaders: [...ERROR_HEADERS],
};
