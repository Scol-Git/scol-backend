import { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';
import { CommissionType } from '@shared/enums/CommissionType.enum';
import { defineImportSchema } from '../schema/defineImportSchema';
import {
  decimal,
  enumUpper,
  int,
  locationMap,
  metaDataItems,
  quotedUrlList,
  text,
  url,
} from '../schema/parsers';

const CURRENT_YEAR = new Date().getFullYear();

export const UNIVERSITY_SCHEMA = defineImportSchema({
  type: BulkImportType.UNIVERSITY,
  columns: [
    { header: 'uniName', entity: 'university', field: 'uniName', parse: text({ max: 255 }), required: 'import', example: 'Anglia Ruskin University - ARU' },
    { header: 'countryName', entity: 'university', field: 'sysCountryId', parse: text({ max: 100 }), lookup: { table: 'country', mode: 'orDraft' }, required: 'import', example: 'United Kingdom' },
    { header: 'stateName', entity: 'university', field: 'sysStateId', parse: text({ max: 100 }), lookup: { table: 'state', mode: 'orDraft' }, required: 'import', example: 'England' },
    { header: 'cityName', entity: 'university', field: 'sysCityId', parse: text({ max: 100 }), lookup: { table: 'city', mode: 'orDraft' }, required: 'import', example: 'Cambridge' },
    { header: 'address', entity: 'university', field: 'address', parse: text({ max: 500 }), required: 'publish', example: 'East Road, Cambridge CB1 1PT' },
    { header: 'commissionType', entity: 'university', field: 'commissionType', parse: enumUpper(CommissionType), required: 'publish', example: 'PERCENTAGE' },
    { header: 'commission', entity: 'university', field: 'commission', parse: decimal({ min: 0 }), required: 'publish', example: '18' },
    { header: 'logoUrl', entity: 'university', field: 'logoUrl', parse: url(), required: 'publish', example: 'https://example.com/logo.jpg' },
    { header: 'website', entity: 'university', field: 'website', parse: url(), required: 'publish', example: 'https://www.example.ac.uk' },
    { header: 'aboutUs', entity: 'university', field: 'aboutUs', parse: text(), required: 'publish', example: 'About the university...' },
    { header: 'coverImageUrl', entity: 'university', field: 'coverImageUrl', parse: url(), required: 'publish', example: 'https://example.com/cover.jpg' },
    { header: 'campusLifeLinks', entity: 'university', field: 'campusLifeLinks', parse: quotedUrlList(), required: 'publish', example: '"https://youtu.be/a", "https://youtu.be/b"' },
    { header: 'rankingMetaData', entity: 'university', field: 'rankingMetaData', parse: metaDataItems(), required: 'publish', example: '[{"subtitle":"Ranking","description":["102nd ..."]}]' },
    { header: 'locationMapMetaData', entity: 'university', field: 'locationMapMetaData', parse: locationMap(), required: 'publish', example: '{"href":"https://maps.google.com/..."}' },
    { header: 'establishedYear', entity: 'university', field: 'establishedYear', parse: int({ min: 1000, max: CURRENT_YEAR }), required: 'publish', example: '1858' },
    { header: 'universityType', entity: 'university', field: 'universityType', parse: text({ max: 100 }), required: 'publish', example: 'Public' },
    { header: 'currRanking', entity: 'university', field: 'currRanking', parse: int({ min: 1 }), required: 'publish', example: '102' },
  ],
});
