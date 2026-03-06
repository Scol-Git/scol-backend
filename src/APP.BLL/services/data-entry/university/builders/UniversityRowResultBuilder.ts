import { Injectable } from '@nestjs/common';
import type { UniversityCsvRow, ReviewedUniversityRow, ErrorUniversityRow } from '../dto/UniversityCsvRow';
import type { LocationMaps } from '../resolvers/LocationMaps';
import { stateKey, cityKey, universityKey } from '../resolvers/ImportKeys';

@Injectable()
export class UniversityRowResultBuilder {
  /**
   * Builds reviewed and error rows from resolution results only. No validation (done earlier).
   * Checks: country/state/city existence, university resolution, duplicate rows.
   */
  buildImportResults(
    rows: UniversityCsvRow[],
    locationMaps: LocationMaps,
    universityIdByKey: Map<string, string>,
  ): { reviewedRows: ReviewedUniversityRow[]; errorRows: ErrorUniversityRow[] } {
    const reviewedRows: ReviewedUniversityRow[] = [];
    const errorRows: ErrorUniversityRow[] = [];
    const seenUniKeys = new Set<string>();

    for (const row of rows) {
      const reason = this.getResolutionErrorReason(
        row,
        locationMaps,
        universityIdByKey,
        seenUniKeys,
      );
      if (reason) {
        errorRows.push({ ...row, errorReason: reason });
        continue;
      }
      const countryName = row.countryName.trim();
      const stateName = row.stateName.trim();
      const cityName = row.cityName.trim();
      const uniName = row.uniName.trim();
      const { countryMap, stateMap, cityMap } = locationMaps;
      const sysCountryId = countryMap.get(countryName.toLowerCase())!;
      const sysStateId = stateMap.get(stateKey(sysCountryId, stateName))!;
      const sysCityId = cityMap.get(cityKey(sysStateId, cityName))!;
      const key = universityKey(uniName, sysCountryId, sysCityId);
      seenUniKeys.add(key);
      const id = universityIdByKey.get(key)!;
      reviewedRows.push({ ...row, sysCountryId, sysStateId, sysCityId, id });
    }
    return { reviewedRows, errorRows };
  }

  /**
   * Resolution-only checks: location existence, university id, duplicate. No validation.
   */
  private getResolutionErrorReason(
    row: UniversityCsvRow,
    { countryMap, stateMap, cityMap }: LocationMaps,
    universityIdByKey: Map<string, string>,
    seenUniKeys: Set<string>,
  ): string | null {
    const countryName = row.countryName.trim();
    const stateName = row.stateName.trim();
    const cityName = row.cityName.trim();
    const uniName = row.uniName.trim();

    if (!countryName) return 'no country name found';
    if (!stateName) return 'no state name found';
    if (!cityName) return 'no city name found';
    if (!uniName) return 'no university name found';

    const sysCountryId = countryMap.get(countryName.toLowerCase());
    if (!sysCountryId) return 'country not found';

    const sysStateId = stateMap.get(stateKey(sysCountryId, stateName));
    if (!sysStateId) return 'state not found for country';

    const sysCityId = cityMap.get(cityKey(sysStateId, cityName));
    if (!sysCityId) return 'city not found for state';

    const key = universityKey(uniName, sysCountryId, sysCityId);
    const uniId = universityIdByKey.get(key);
    if (!uniId) return 'university resolution failed';
    if (seenUniKeys.has(key)) return 'duplicate row';

    return null;
  }
}
