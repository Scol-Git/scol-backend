import { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';
import { BulkImportStorageKeyBuilder } from './BulkImportStorageKeyBuilder';

describe('BulkImportStorageKeyBuilder', () => {
  const b = new BulkImportStorageKeyBuilder();
  const id = '11111111-1111-1111-1111-111111111111';

  it('builds university keys', () => {
    expect(b.originalKey(BulkImportType.UNIVERSITY, id)).toBe(`bulk-imports/universities/${id}/original.csv`);
    expect(b.errorsKey(BulkImportType.UNIVERSITY, id)).toBe(`bulk-imports/universities/${id}/errors.csv`);
  });

  it('builds course keys', () => {
    expect(b.originalKey(BulkImportType.COURSE, id)).toBe(`bulk-imports/courses/${id}/original.csv`);
    expect(b.errorsKey(BulkImportType.COURSE, id)).toBe(`bulk-imports/courses/${id}/errors.csv`);
  });
});
