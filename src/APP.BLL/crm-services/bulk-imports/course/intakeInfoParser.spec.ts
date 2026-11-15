import { ImportErrorCode } from '../common/ImportErrorCode';
import { parseIntakeList } from './intakeInfoParser';

const values = (raw: string) => {
  const r = parseIntakeList(raw);
  if (!r.ok) throw new Error(r.message);
  return r.value;
};

describe('parseIntakeList', () => {
  it('parses full month name', () => {
    expect(values('September 2027')).toEqual([{ month: 9, year: 2027 }]);
  });
  it('parses short form Sep-27', () => {
    expect(values('Sep-27')).toEqual([{ month: 9, year: 2027 }]);
  });
  it('sorts multiple intakes', () => {
    expect(values('September 2027, May 2027')).toEqual([
      { month: 5, year: 2027 },
      { month: 9, year: 2027 },
    ]);
  });
  it('rejects unknown month token', () => {
    const r = parseIntakeList('Sept 2027');
    expect(!r.ok && r.code).toBe(ImportErrorCode.INVALID_INTAKE);
  });
  it('rejects the whole cell if any token is bad', () => {
    expect(parseIntakeList('Sep 2027, nope').ok).toBe(false);
  });
  it('removes duplicates', () => {
    expect(values('Sep 2027, Sep 2027')).toHaveLength(1);
  });
  it('accepts , ; | separators', () => {
    expect(values('Sep 2027; Jan 2028 | May 2028')).toHaveLength(3);
  });
});
