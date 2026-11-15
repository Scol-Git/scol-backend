import { decodeUtf8Strict, parseCsv } from './CsvParser';
import { ImportErrorCode } from './ImportErrorCode';
import { ImportReport } from './ImportReport';

const headers = ['a', 'b'];
const rows = [
  { a: '1', b: 'x' }, // record 2
  { a: '2', b: 'y' }, // record 3
  { a: '3', b: 'z' }, // record 4
];

const parse = (buf: Buffer) => parseCsv(decodeUtf8Strict(buf));

describe('ImportReport', () => {
  it('errors.csv has original headers + 4 extra columns, one line per row with issues', () => {
    const r = new ImportReport(headers, rows);
    r.addError(4, ImportErrorCode.UNKNOWN_DEGREE, 'bad degree');
    r.addIssues(2, [{ severity: 'WARNING', code: ImportErrorCode.MISSING_FOR_PUBLISH, message: 'w1' }]);
    r.addIssues(2, [{ severity: 'WARNING', code: ImportErrorCode.PUBLISHED_DIFFERS, message: 'w2' }]);

    const csv = parse(r.buildErrorsCsv());
    expect(csv.headers).toEqual(['a', 'b', 'rowNumber', 'severity', 'errorCode', 'errorMessage']);
    expect(csv.rows).toHaveLength(2);
    // sorted by rowNumber
    expect(csv.rows[0]).toMatchObject({ a: '1', rowNumber: '2', severity: 'WARNING', errorCode: 'MISSING_FOR_PUBLISH', errorMessage: 'w1 | w2' });
    expect(csv.rows[1]).toMatchObject({ a: '3', rowNumber: '4', severity: 'ERROR', errorCode: 'UNKNOWN_DEGREE' });
  });

  it('a row with both an error and a warning reports the ERROR', () => {
    const r = new ImportReport(headers, rows);
    r.addIssues(3, [
      { severity: 'WARNING', code: ImportErrorCode.MISSING_FOR_PUBLISH, message: 'w' },
      { severity: 'ERROR', code: ImportErrorCode.INVALID_FORMAT, message: 'e' },
    ]);
    const row = parse(r.buildErrorsCsv()).rows[0];
    expect(row.severity).toBe('ERROR');
    expect(row.errorCode).toBe('INVALID_FORMAT');
  });

  it('ignored-columns line has rowNumber = 1', () => {
    const r = new ImportReport(headers, rows);
    r.addIgnoredColumns(['commission', 'foo']);
    const csv = parse(r.buildErrorsCsv());
    expect(csv.rows[0]).toMatchObject({
      rowNumber: '1',
      severity: 'WARNING',
      errorCode: 'IGNORED_COLUMN',
      errorMessage: 'Ignored columns: commission, foo',
    });
  });

  it('errorCount counts rows with an error; warningCount counts warning-only rows', () => {
    const r = new ImportReport(headers, rows);
    r.addError(2, ImportErrorCode.INVALID_FORMAT, 'e');
    r.addIssues(2, [{ severity: 'WARNING', code: ImportErrorCode.MISSING_FOR_PUBLISH, message: 'w' }]);
    r.addIssues(3, [{ severity: 'WARNING', code: ImportErrorCode.MISSING_FOR_PUBLISH, message: 'w' }]);
    expect(r.errorCount).toBe(1);
    expect(r.warningCount).toBe(1);
    expect(r.hasIssues).toBe(true);
  });

  it('has no issues when nothing was reported', () => {
    expect(new ImportReport(headers, rows).hasIssues).toBe(false);
  });
});
