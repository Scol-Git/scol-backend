import * as fs from 'fs';
import * as path from 'path';
import { decodeUtf8Strict, parseCsv } from '../common/CsvParser';
import { UniversityImportHandler } from './UniversityImportHandler';
import type { UniversityDraftWriter } from './UniversityDraftWriter';

const handler = new UniversityImportHandler({} as UniversityDraftWriter);
const now = new Date('2026-11-15');
const fixture = parseCsv(
  decodeUtf8Strict(fs.readFileSync(path.join(__dirname, '..', '__fixtures__', 'university.csv'))),
);

describe('UniversityImportHandler (pure parts)', () => {
  it('validates all 4 fixture rows with 0 errors', () => {
    expect(fixture.rows).toHaveLength(4);
    fixture.rows.forEach((raw, i) => {
      const r = handler.validate({ rowNumber: i + 2, raw }, now);
      expect(r.issues.filter((x) => x.severity === 'ERROR')).toEqual([]);
      expect(r.valid).toBeDefined();
    });
  });

  it('commission without commissionType is an error', () => {
    const raw = { ...fixture.rows[0], commissionType: '' };
    const r = handler.validate({ rowNumber: 2, raw }, now);
    expect(r.valid).toBeUndefined();
    expect(r.issues.some((i) => i.column === 'commission')).toBe(true);
  });

  it('city without state is an error', () => {
    const raw = { ...fixture.rows[0], stateName: '', cityName: 'Cambridge' };
    const r = handler.validate({ rowNumber: 2, raw }, now);
    expect(r.issues.some((i) => i.column === 'cityName' && i.severity === 'ERROR')).toBe(true);
  });

  it('percentage commission above 100 is an error', () => {
    const raw = { ...fixture.rows[0], commissionType: 'percentage', commission: '101' };
    expect(handler.validate({ rowNumber: 2, raw }, now).valid).toBeUndefined();
  });

  it('naturalKey is case-insensitive and collapses spaces', () => {
    const a = handler.validate({ rowNumber: 2, raw: { ...fixture.rows[0], uniName: 'Foo  University' } }, now).valid!;
    const b = handler.validate({ rowNumber: 3, raw: { ...fixture.rows[0], uniName: 'foo university' } }, now).valid!;
    expect(handler.naturalKey(a)).toBe(handler.naturalKey(b));
  });
});
