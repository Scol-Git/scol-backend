import * as fs from 'fs';
import * as path from 'path';
import { decodeUtf8Strict, parseCsv } from '../common/CsvParser';
import { ImportErrorCode } from '../common/ImportErrorCode';
import { CourseImportHandler } from './CourseImportHandler';
import type { CourseCtx } from './courseContext';
import type { CourseDraftWriter } from './CourseDraftWriter';

const handler = new CourseImportHandler({} as CourseDraftWriter);
const fixture = parseCsv(
  decodeUtf8Strict(
    fs.readFileSync(path.join(__dirname, '..', '__fixtures__', 'birmingham-city-university.csv')),
  ),
);
// Fixture row 3 has "September 2026": it is valid only while that month is not yet past.
const NOW = new Date('2026-06-01');

describe('CourseImportHandler (pure parts)', () => {
  it('validates all fixture rows with 0 errors (now = 2026-06-01)', () => {
    expect(fixture.rows.length).toBeGreaterThan(0);
    fixture.rows.forEach((raw, i) => {
      const r = handler.validate({ rowNumber: i + 2, raw }, NOW);
      expect(r.issues.filter((x) => x.severity === 'ERROR')).toEqual([]);
    });
  });

  it('flags INTAKE_IN_PAST for the September 2026 row when now is 2026-11-15', () => {
    const r = handler.validate({ rowNumber: 3, raw: fixture.rows[1] }, new Date('2026-11-15'));
    expect(r.valid).toBeUndefined();
    expect(r.issues.some((i) => i.code === ImportErrorCode.INTAKE_IN_PAST)).toBe(true);
  });

  it('flags INTAKE_IN_PAST when now is 2028-01-01', () => {
    const r = handler.validate({ rowNumber: 2, raw: fixture.rows[0] }, new Date('2028-01-01'));
    expect(r.valid).toBeUndefined();
    expect(r.issues.some((i) => i.code === ImportErrorCode.INTAKE_IN_PAST)).toBe(true);
  });

  it('minGpa without minDegreeName is an error', () => {
    const raw = { ...fixture.rows[0], minDegreeName: '', minGpa: '4' };
    expect(handler.validate({ rowNumber: 2, raw }, NOW).issues.some((i) => i.column === 'minGpa')).toBe(true);
  });

  it('partial scholarship is an error', () => {
    const raw = { ...fixture.rows[0], scholarshipName: 'X', scholarshipType: '', scholarshipAmount: '' };
    expect(handler.validate({ rowNumber: 2, raw }, NOW).valid).toBeUndefined();
  });

  it('English section without overall is an error', () => {
    const raw = { ...fixture.rows[0], ieltsMinOverall: '', ieltsMinSection: '5.5' };
    expect(handler.validate({ rowNumber: 2, raw }, NOW).issues.some((i) => i.column === 'ieltsMinSection')).toBe(true);
  });

  it('resolve() reports UNKNOWN_DEGREE and UNIVERSITY_NOT_FOUND', () => {
    const valid = handler.validate({ rowNumber: 2, raw: { ...fixture.rows[0], degreeName: 'MSc' } }, NOW).valid!;
    const ctx: CourseCtx = {
      universities: new Map(),
      programmes: new Map(),
      degrees: new Map([['bsc', 'id-bsc']]),
      englishTests: new Map(),
      existingCourses: new Map(),
      existingIntakes: new Map(),
    };
    const codes = (handler.resolve([valid], ctx).get(2) ?? []).map((i) => i.code);
    expect(codes).toContain(ImportErrorCode.UNKNOWN_DEGREE);
    expect(codes).toContain(ImportErrorCode.UNIVERSITY_NOT_FOUND);
  });

  it('naturalKey = uni|course|degree normalised', () => {
    const v = handler.validate({ rowNumber: 2, raw: fixture.rows[0] }, NOW).valid!;
    expect(handler.naturalKey(v).split('|')).toHaveLength(3);
  });
});
