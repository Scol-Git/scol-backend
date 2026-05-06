import { Injectable } from '@nestjs/common';
import type { CsvRow } from '../../common/abstractions/CsvImportProcessor';
import { CourseImportSchema } from '../CourseImportSchema';
import type {
  CourseReviewedIdFields,
  ErrorCourseRow,
} from '../dto/CourseImportRowTypes';
import {
  formatImportError,
  ImportErrorCode,
} from '../../common/abstractions/ImportErrorCode';

/**
 * Builds resolution error and reviewed rows (same role as {@link UniversityRowResultBuilder}).
 * Validation errors are produced by {@link CourseRowValidator}; this type handles post-validation
 * catalog resolution failures and successful reviewed output shape.
 */
@Injectable()
export class CourseRowResultBuilder {
  /** Input columns only (for error/reviewed CSV rows). */
  flattenInputRow(row: CsvRow): Record<string, string> {
    const out: Record<string, string> = {};
    for (const h of CourseImportSchema.inputHeaders) {
      out[h] = row[h] ?? '';
    }
    return out;
  }

  resolutionError(
    base: Record<string, string>,
    errorReason: string,
  ): ErrorCourseRow {
    return { ...base, errorReason };
  }

  unexpectedError(base: Record<string, string>, message: string): ErrorCourseRow {
    return this.resolutionError(
      base,
      formatImportError(ImportErrorCode.UNEXPECTED_ERROR, message),
    );
  }

  reviewed(
    base: Record<string, string>,
    ids: CourseReviewedIdFields,
  ): Record<string, string> {
    return {
      ...base,
      uniId: ids.uniId,
      sysProgrammeId: ids.sysProgrammeId,
      sysDegreeId: ids.sysDegreeId,
      minSysDegreeId: ids.minSysDegreeId,
      higherSysDegreeId: ids.higherSysDegreeId,
      uniCourseId: ids.uniCourseId,
      courseIntakeId: ids.courseIntakeId,
      sysEngTestIdIelts: ids.sysEngTestIdIelts,
      courseEngReqIdIelts: ids.courseEngReqIdIelts,
      sysEngTestIdToefl: ids.sysEngTestIdToefl,
      courseEngReqIdToefl: ids.courseEngReqIdToefl,
      sysEngTestIdPte: ids.sysEngTestIdPte,
      courseEngReqIdPte: ids.courseEngReqIdPte,
      scholarshipId: ids.scholarshipId,
    };
  }
}
