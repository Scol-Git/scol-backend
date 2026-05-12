import { Injectable } from '@nestjs/common';
import type {
  ValidatedUniversityCsvRow,
  ReviewedUniversityRow,
  ErrorUniversityRow,
} from '../dto/UniversityCsvRow';
import type { LocationMaps } from '../resolvers/LocationMaps';
import { universityKey } from '../resolvers/ImportKeys';
import { resolveUniversityRowLocations } from '../resolvers/universityLocationResolution';
import {
  formatImportError,
  ImportErrorCode,
} from '../../common/abstractions/ImportErrorCode';

@Injectable()
export class UniversityRowResultBuilder {
  /**
   * Builds reviewed and error rows from resolution results only. No validation (done earlier).
   * Checks: country/state/city existence, university resolution, duplicate rows.
   */
  buildImportResults(
    rows: ValidatedUniversityCsvRow[],
    locationMaps: LocationMaps,
    universityIdByKey: Map<string, string>,
  ): { reviewedRows: ReviewedUniversityRow[]; errorRows: ErrorUniversityRow[] } {
    const reviewedRows: ReviewedUniversityRow[] = [];
    const errorRows: ErrorUniversityRow[] = [];
    const seenUniKeys = new Set<string>();

    for (const row of rows) {
      const outcome = this.resolveAndValidateForOutput(
        row,
        locationMaps,
        universityIdByKey,
        seenUniKeys,
      );
      if (outcome.kind === 'error') {
        errorRows.push({ ...row, errorReason: outcome.reason });
        continue;
      }
      const { sysCountryId, sysStateId, sysCityId, key, id } = outcome;
      seenUniKeys.add(key);
      reviewedRows.push({ ...row, sysCountryId, sysStateId, sysCityId, id });
    }
    return { reviewedRows, errorRows };
  }

  /**
   * Location + upsert map + duplicate checks. Location messages match {@link resolveUniversityRowLocations}.
   */
  private resolveAndValidateForOutput(
    row: ValidatedUniversityCsvRow,
    locationMaps: LocationMaps,
    universityIdByKey: Map<string, string>,
    seenUniKeys: Set<string>,
  ):
    | { kind: 'error'; reason: string }
    | {
        kind: 'ok';
        key: string;
        id: string;
        sysCountryId: string;
        sysStateId: string;
        sysCityId: string;
      } {
    const loc = resolveUniversityRowLocations(row, locationMaps);
    if (!loc.ok) {
      return { kind: 'error', reason: loc.errorReason };
    }
    const { sysCountryId, sysStateId, sysCityId } = loc;
    const uniName = row.uniName.trim();
    const key = universityKey(uniName, sysCountryId, sysCityId);
    const uniId = universityIdByKey.get(key);
    if (!uniId) {
      return {
        kind: 'error',
        reason: formatImportError(
          ImportErrorCode.RESOLUTION_FAILED,
          'university not found at resolved location (no upserted row for this name and country/state/city)',
        ),
      };
    }
    if (seenUniKeys.has(key)) {
      return {
        kind: 'error',
        reason: formatImportError(ImportErrorCode.DUPLICATE_ROW, 'duplicate row'),
      };
    }
    return {
      kind: 'ok',
      key,
      id: uniId,
      sysCountryId,
      sysStateId,
      sysCityId,
    };
  }
}
