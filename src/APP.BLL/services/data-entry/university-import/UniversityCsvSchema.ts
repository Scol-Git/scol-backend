/**
 * Defines the CSV column schema for university bulk import (input, reviewed, and error output headers).
 */

import type { CsvImportSchema } from '../bulk-import/abstractions/CsvImportSchema';

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
] as const;

const REVIEWED_HEADERS = [
  ...INPUT_HEADERS,
  'sysCountryId',
  'sysStateId',
  'sysCityId',
  'id',
];

const ERROR_HEADERS = [...INPUT_HEADERS, 'errorReason'];

export const UniversityCsvImportSchema: CsvImportSchema = {
  inputHeaders: [...INPUT_HEADERS],
  reviewedHeaders: [...REVIEWED_HEADERS],
  errorHeaders: [...ERROR_HEADERS],
};
