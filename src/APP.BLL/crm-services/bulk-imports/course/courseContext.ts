import type { ValidRow } from '../common/BulkImportHandler';
import { normName } from '../common/normName';

export type EnglishTestName = 'IELTS' | 'PTE' | 'TOEFL';
export const ENGLISH_TESTS: readonly EnglishTestName[] = ['IELTS', 'PTE', 'TOEFL'];

export interface CourseCtx {
  /** normName(uniName) -> id (published OR draft) */
  universities: Map<string, string>;
  /** normName(name) -> id */
  programmes: Map<string, string>;
  /** normName(degreeName) -> id and the scale minGpa/higherGpa must not exceed */
  degrees: Map<string, { id: string; gpaScale: number | null }>;
  englishTests: Map<EnglishTestName, { id: string; maxScore: number | null }>;
  /** `${uniId}|${normName(courseName)}|${degreeId}` -> course */
  existingCourses: Map<string, { id: string; isPublished: boolean }>;
  /** `${courseId}|${year}|${month}` -> intake */
  existingIntakes: Map<string, { id: string; isPublished: boolean }>;
}

export interface ResolvedCourseIds {
  uniId: string;
  programmeId: string | null;
  degreeId: string;
  minDegreeId: string | null;
  higherDegreeId: string | null;
}

export const testHeader = (t: EnglishTestName, part: 'Overall' | 'Section'): string =>
  `${t.toLowerCase()}Min${part}`;

/** Resolve all ids of a row from the context (pure). Returns null if something is unresolved. */
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function resolveCourseIds(row: ValidRow, ctx: CourseCtx): ResolvedCourseIds | null {
  const v = row.values;
  const uniId = ctx.universities.get(normName(v.uniName as string));
  const degree = ctx.degrees.get(normName(v.degreeName as string));
  const degreeId = degree?.id;
  if (!uniId || !degreeId) return null;
  const optDegree = (header: string): string | null => {
    const n = strOrNull(v[header]);
    return n ? (ctx.degrees.get(normName(n))?.id ?? null) : null;
  };
  return {
    uniId,
    degreeId,
    programmeId: ctx.programmes.get(normName(v.programmeName as string)) ?? null,
    minDegreeId: optDegree('minDegreeName'),
    higherDegreeId: optDegree('higherDegreeName'),
  };
}
