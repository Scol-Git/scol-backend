import * as fs from 'fs';
import * as path from 'path';
import { decodeUtf8Strict, InvalidEncodingError, parseCsv } from './CsvParser';

const fixture = (name: string) =>
  fs.readFileSync(path.join(__dirname, '..', '__fixtures__', name));

describe('CsvParser', () => {
  it('parses the university fixture into 4 records with 17 headers', () => {
    const { headers, rows } = parseCsv(decodeUtf8Strict(fixture('university.csv')));
    expect(headers).toHaveLength(17);
    expect(rows).toHaveLength(4);
    expect(rows[0].aboutUs.length).toBeGreaterThan(50);
  });

  it('throws on invalid UTF-8', () => {
    expect(() => decodeUtf8Strict(Buffer.from([0xff, 0xfe]))).toThrow(InvalidEncodingError);
  });

  it('strips a BOM', () => {
    const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('a,b\n1,2')]);
    const { headers } = parseCsv(decodeUtf8Strict(withBom));
    expect(headers).toEqual(['a', 'b']);
  });

  it('fills short rows with empty strings and keeps quoted newlines', () => {
    const { rows } = parseCsv('a,b,c\n1,"x\ny"\n');
    expect(rows[0]).toEqual({ a: '1', b: 'x\ny', c: '' });
  });
});
