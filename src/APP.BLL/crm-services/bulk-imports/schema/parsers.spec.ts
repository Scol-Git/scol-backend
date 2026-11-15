import { CommissionType } from '@shared/enums/CommissionType.enum';
import { ImportErrorCode } from '../common/ImportErrorCode';
import {
  currencyCode,
  decimal,
  enumUpper,
  int,
  intakeList,
  isoDate,
  locationMap,
  metaDataItems,
  quotedUrlList,
  text,
  url,
} from './parsers';

describe('parsers', () => {
  it('text enforces max', () => {
    expect(text({ max: 3 })('abc')).toEqual({ ok: true, value: 'abc' });
    expect(text({ max: 3 })('abcd').ok).toBe(false);
  });

  it('decimal accepts plain numbers, rejects separators and symbols', () => {
    expect(decimal()('19220')).toEqual({ ok: true, value: '19220' });
    expect(decimal()('5.5')).toEqual({ ok: true, value: '5.5' });
    expect(decimal()('19,220').ok).toBe(false);
    expect(decimal()('£19220').ok).toBe(false);
    expect(decimal({ min: 0 })('-1').ok).toBe(false);
    expect(decimal({ max: 100 })('101').ok).toBe(false);
  });

  it('int accepts whole numbers and enforces range', () => {
    expect(int({ min: 1 })('36')).toEqual({ ok: true, value: 36 });
    expect(int()('3.5').ok).toBe(false);
    expect(int({ max: 10 })('11').ok).toBe(false);
  });

  it('enumUpper uppercases', () => {
    expect(enumUpper(CommissionType)('percentage')).toEqual({ ok: true, value: 'PERCENTAGE' });
    expect(enumUpper(CommissionType)('nope').ok).toBe(false);
  });

  it('url accepts http(s) only', () => {
    expect(url()('https://a.com/x').ok).toBe(true);
    expect(url()('ftp://a.com').ok).toBe(false);
    expect(url()('not a url').ok).toBe(false);
  });

  it('quotedUrlList parses a quoted list', () => {
    expect(quotedUrlList()('"https://a.com", "https://b.com"')).toEqual({
      ok: true,
      value: ['https://a.com', 'https://b.com'],
    });
    expect(quotedUrlList()('https://a.com').ok).toBe(false);
    expect(quotedUrlList()('"nope"').ok).toBe(false);
  });

  it('metaDataItems validates structure', () => {
    expect(metaDataItems()('[{"subtitle":"a","description":["b"]}]').ok).toBe(true);
    expect(metaDataItems()('{"a":1}').ok).toBe(false);
    expect(metaDataItems()('not json').ok).toBe(false);
  });

  it('locationMap accepts url, json string and {href}', () => {
    expect(locationMap()('https://maps.google.com/x').ok).toBe(true);
    expect(locationMap()('{"href":"https://maps.google.com/x"}').ok).toBe(true);
    expect(locationMap()('"https://maps.google.com/x"').ok).toBe(true);
    expect(locationMap()('{"href":"nope"}').ok).toBe(false);
    expect(locationMap()('{bad').ok).toBe(false);
  });

  it('isoDate rejects impossible dates', () => {
    expect(isoDate()('2027-02-28').ok).toBe(true);
    expect(isoDate()('2027-02-30').ok).toBe(false);
    expect(isoDate()('28/02/2027').ok).toBe(false);
  });

  it('currencyCode uppercases', () => {
    expect(currencyCode()('gbp')).toEqual({ ok: true, value: 'GBP' });
    expect(currencyCode()('pound').ok).toBe(false);
  });

  it('intakeList wraps parseIntakeList', () => {
    const r = intakeList()('Sep-27');
    expect(r.ok && r.value).toEqual([{ month: 9, year: 2027 }]);
    const bad = intakeList()('Sept 2027');
    expect(!bad.ok && bad.code).toBe(ImportErrorCode.INVALID_INTAKE);
  });
});
