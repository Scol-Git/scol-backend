import * as fs from 'fs';
import * as path from 'path';
import { decodeUtf8Strict, parseCsv } from '../common/CsvParser';
import { COURSE_SCHEMA } from '../course/course.schema';
import { UNIVERSITY_SCHEMA } from '../university/university.schema';
import { checkHeaders } from './HeaderValidator';

const load = (name: string) =>
  parseCsv(decodeUtf8Strict(fs.readFileSync(path.join(__dirname, '..', '__fixtures__', name))));

describe('checkHeaders', () => {
  it('course fixture: nothing missing, commission ignored', () => {
    const { headers } = load('birmingham-city-university.csv');
    expect(checkHeaders(COURSE_SCHEMA, headers)).toEqual({ missing: [], ignored: ['commission'] });
  });

  it('university fixture: nothing missing or ignored', () => {
    const { headers } = load('university.csv');
    expect(checkHeaders(UNIVERSITY_SCHEMA, headers)).toEqual({ missing: [], ignored: [] });
  });

  it('reports missing headers (case-sensitive)', () => {
    const r = checkHeaders(UNIVERSITY_SCHEMA, ['uniname']);
    expect(r.missing).toContain('uniName');
    expect(r.ignored).toEqual(['uniname']);
  });
});
