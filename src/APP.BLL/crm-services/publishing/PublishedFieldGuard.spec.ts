import { ValidationException } from '@shared/exceptions/ValidationException';
import { assertPublishFieldsNotCleared } from './PublishedFieldGuard';
import { PUBLISH_COLUMNS } from './PublishReadinessChecker';

describe('PUBLISH_COLUMNS (derived from the import schemas)', () => {
  it('university', () => {
    expect(PUBLISH_COLUMNS.university.map((c) => c.column)).toEqual([
      'sysCityId',
      'commissionType',
      'commission',
      'logoUrl',
      'aboutUs',
    ]);
  });
  it('course and intake', () => {
    expect(PUBLISH_COLUMNS.course.map((c) => c.column)).toEqual(['minSysDegreeId']);
    expect(PUBLISH_COLUMNS.intake.map((c) => c.column)).toEqual([
      'courseDuration',
      'currency',
      'tuitionFee',
    ]);
  });
  it('reports CSV headers, not column names', () => {
    expect(PUBLISH_COLUMNS.university[0].header).toBe('cityName');
  });
});

describe('assertPublishFieldsNotCleared', () => {
  it('allows clearing on a draft', () => {
    expect(() => assertPublishFieldsNotCleared('university', false, { logoUrl: null })).not.toThrow();
  });

  it('rejects clearing a required-for-publish field on a published row', () => {
    expect(() => assertPublishFieldsNotCleared('university', true, { logoUrl: null })).toThrow(
      ValidationException,
    );
    expect(() => assertPublishFieldsNotCleared('intake', true, { tuitionFee: '' })).toThrow(
      ValidationException,
    );
  });

  it('ignores fields not in the PATCH body and optional fields', () => {
    expect(() => assertPublishFieldsNotCleared('university', true, { website: null })).not.toThrow();
    expect(() => assertPublishFieldsNotCleared('university', true, {})).not.toThrow();
    expect(() => assertPublishFieldsNotCleared('university', true, { logoUrl: 'https://a.com/x.png' })).not.toThrow();
  });
});
