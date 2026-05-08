import type { ValidatedUniversityCsvRow } from '../dto/UniversityCsvRow';
import type { LocationMaps } from './LocationMaps';
import { stateKey, cityKey } from './ImportKeys';
import {
  formatImportError,
  ImportErrorCode,
} from '../../common/abstractions/ImportErrorCode';

export type UniversityRowLocationsOk = {
  ok: true;
  sysCountryId: string;
  sysStateId: string;
  sysCityId: string;
};

export type UniversityRowLocationsErr = {
  ok: false;
  errorReason: string;
};

export type UniversityRowLocationsResult =
  | UniversityRowLocationsOk
  | UniversityRowLocationsErr;

/**
 * Single source of truth for mapping CSV location + uni columns to IDs.
 * Used by {@link UniversityResolverService} (skip row) and {@link UniversityRowResultBuilder} (user-facing error).
 */
export function resolveUniversityRowLocations(
  row: ValidatedUniversityCsvRow,
  { countryMap, stateMap, cityMap }: LocationMaps,
): UniversityRowLocationsResult {
  const countryName = row.countryName.trim();
  const stateName = row.stateName.trim();
  const cityName = row.cityName.trim();
  const uniName = row.uniName.trim();

  if (!countryName) {
    return {
      ok: false,
      errorReason: formatImportError(
        ImportErrorCode.MISSING_REQUIRED_FIELD,
        'no country name found',
      ),
    };
  }
  if (!stateName) {
    return {
      ok: false,
      errorReason: formatImportError(
        ImportErrorCode.MISSING_REQUIRED_FIELD,
        'no state name found',
      ),
    };
  }
  if (!cityName) {
    return {
      ok: false,
      errorReason: formatImportError(
        ImportErrorCode.MISSING_REQUIRED_FIELD,
        'no city name found',
      ),
    };
  }
  if (!uniName) {
    return {
      ok: false,
      errorReason: formatImportError(
        ImportErrorCode.MISSING_REQUIRED_FIELD,
        'no university name found',
      ),
    };
  }

  const sysCountryId = countryMap.get(countryName.toLowerCase());
  if (!sysCountryId) {
    return {
      ok: false,
      errorReason: formatImportError(
        ImportErrorCode.RESOLUTION_FAILED,
        'country not found',
      ),
    };
  }

  const sysStateId = stateMap.get(stateKey(sysCountryId, stateName));
  if (!sysStateId) {
    return {
      ok: false,
      errorReason: formatImportError(
        ImportErrorCode.RESOLUTION_FAILED,
        'state not found for country',
      ),
    };
  }

  const sysCityId = cityMap.get(cityKey(sysStateId, cityName));
  if (!sysCityId) {
    return {
      ok: false,
      errorReason: formatImportError(
        ImportErrorCode.RESOLUTION_FAILED,
        'city not found for state',
      ),
    };
  }

  return { ok: true, sysCountryId, sysStateId, sysCityId };
}
