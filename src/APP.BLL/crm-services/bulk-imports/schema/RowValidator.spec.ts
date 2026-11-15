import { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';
import { ImportErrorCode } from '../common/ImportErrorCode';
import { defineImportSchema } from './defineImportSchema';
import { text } from './parsers';
import { cleanCell, hasError, validateCells } from './RowValidator';

const schema = defineImportSchema({
  type: BulkImportType.UNIVERSITY,
  columns: [
    { header: 'a', entity: 'university', field: 'a', parse: text(), required: 'import', example: '' },
    { header: 'b', entity: 'university', field: 'b', parse: text(), required: 'publish', example: '' },
    { header: 'c', entity: 'university', field: 'c', parse: text({ max: 2 }), example: '' },
  ],
});

describe('validateCells', () => {
  it('empty required-import cell is an ERROR', () => {
    const r = validateCells(schema, { a: '', b: 'x', c: '' });
    expect(r.issues).toEqual([
      expect.objectContaining({ severity: 'ERROR', code: ImportErrorCode.MISSING_REQUIRED_FIELD, column: 'a' }),
    ]);
    expect(hasError(r.issues)).toBe(true);
  });

  it('empty required-publish cell is a WARNING', () => {
    const r = validateCells(schema, { a: 'x', b: '', c: '' });
    expect(r.issues).toEqual([
      expect.objectContaining({ severity: 'WARNING', code: ImportErrorCode.MISSING_FOR_PUBLISH, column: 'b' }),
    ]);
    expect(hasError(r.issues)).toBe(false);
  });

  it('removes non-breaking spaces around values', () => {
    expect(cleanCell('  hi  ')).toBe('hi');
    expect(validateCells(schema, { a: ' x ', b: 'y', c: '' }).values.a).toBe('x');
  });

  it('parse failure is an ERROR with the column', () => {
    const r = validateCells(schema, { a: 'x', b: 'y', c: 'toolong' });
    expect(r.issues[0]).toEqual(expect.objectContaining({ severity: 'ERROR', column: 'c' }));
  });
});
