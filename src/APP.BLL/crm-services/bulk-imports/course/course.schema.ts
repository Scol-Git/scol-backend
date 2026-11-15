// required:'publish' values pending product confirmation — change here only.
// field notes: 'intakes' (intakeInfo), 'IELTS.minOverallReq' etc. (English) and the
// scholarship columns do not map 1:1 to a DB column; CourseImportHandler reads them by header.
import { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';
import { defineImportSchema } from '../schema/defineImportSchema';
import {
  currencyCode,
  decimal,
  int,
  intakeList,
  isoDate,
  metaDataItems,
  text,
  url,
} from '../schema/parsers';

export const COURSE_SCHEMA = defineImportSchema({
  type: BulkImportType.COURSE,
  ignoredHeaders: ['commission'],
  columns: [
    { header: 'uniName', entity: 'course', field: 'uniId', parse: text({ max: 255 }), lookup: { table: 'university', mode: 'strict' }, required: 'import', example: 'Birmingham City University' },
    { header: 'programmeName', entity: 'course', field: 'sysProgrammeId', parse: text({ max: 255 }), lookup: { table: 'programme', mode: 'orDraft' }, required: 'import', example: 'Accounting and Finance' },
    { header: 'courseName', entity: 'course', field: 'courseName', parse: text({ max: 255 }), required: 'import', example: 'Accounting and Finance - BSc (Hons)' },
    { header: 'degreeName', entity: 'course', field: 'sysDegreeId', parse: text({ max: 50 }), lookup: { table: 'degree', mode: 'strict' }, required: 'import', example: 'BSc' },
    { header: 'minDegreeName', entity: 'course', field: 'minSysDegreeId', parse: text({ max: 50 }), lookup: { table: 'degree', mode: 'strict' }, required: 'publish', example: 'HSC' },
    { header: 'minGpa', entity: 'course', field: 'minGpa', parse: decimal({ min: 0, max: 999 }), example: '4.5' },
    { header: 'higherDegreeName', entity: 'course', field: 'higherSysDegreeId', parse: text({ max: 50 }), lookup: { table: 'degree', mode: 'strict' }, example: '' },
    { header: 'higherGpa', entity: 'course', field: 'higherGpa', parse: decimal({ min: 0, max: 999 }), example: '' },
    { header: 'intakeInfo', entity: 'intake', field: 'intakes', parse: intakeList(), required: 'import', example: 'September 2027, January 2028' },
    { header: 'courseDuration', entity: 'intake', field: 'courseDuration', parse: int({ min: 1, max: 120 }), required: 'publish', example: '36' },
    { header: 'currency', entity: 'intake', field: 'currency', parse: currencyCode(), required: 'publish', example: 'GBP' },
    { header: 'tuitionFee', entity: 'intake', field: 'tuitionFee', parse: decimal({ min: 0 }), required: 'publish', example: '19220' },
    { header: 'initialDeposit', entity: 'intake', field: 'initialDeposit', parse: decimal({ min: 0 }), example: '1000' },
    { header: 'feesMetaData', entity: 'intake', field: 'feesMetaData', parse: metaDataItems(), example: '[{"subtitle":"Fees","description":["..."]}]' },
    { header: 'applicationFee', entity: 'intake', field: 'applicationFee', parse: decimal({ min: 0 }), example: '' },
    { header: 'applicationDeadline', entity: 'intake', field: 'applicationDeadline', parse: isoDate(), example: '' },
    { header: 'courseUrlExternal', entity: 'course', field: 'externalUrl', parse: url(), example: 'https://www.bcu.ac.uk/courses/...' },
    { header: 'ieltsMinOverall', entity: 'engReq', field: 'IELTS.minOverallReq', parse: decimal({ min: 0 }), example: '6' },
    { header: 'ieltsMinSection', entity: 'engReq', field: 'IELTS.minSectionReq', parse: decimal({ min: 0 }), example: '5.5' },
    { header: 'pteMinOverall', entity: 'engReq', field: 'PTE.minOverallReq', parse: decimal({ min: 0 }), example: '59' },
    { header: 'pteMinSection', entity: 'engReq', field: 'PTE.minSectionReq', parse: decimal({ min: 0 }), example: '59' },
    { header: 'toeflMinOverall', entity: 'engReq', field: 'TOEFL.minOverallReq', parse: decimal({ min: 0 }), example: '72' },
    { header: 'toeflMinSection', entity: 'engReq', field: 'TOEFL.minSectionReq', parse: decimal({ min: 0 }), example: '17' },
    { header: 'scholarshipName', entity: 'scholarship', field: 'name', parse: text({ max: 255 }), example: 'International Undergraduate Scholarship' },
    { header: 'scholarshipType', entity: 'scholarship', field: 'amountType', parse: text({ max: 50 }), example: 'Amount' },
    { header: 'scholarshipAmount', entity: 'scholarship', field: 'amount', parse: decimal({ min: 0 }), example: '5000' },
    { header: 'scholarshipMetaData', entity: 'intake', field: 'scholarshipMetaData', parse: metaDataItems(), example: '[{"subtitle":"Scholarships","description":["..."]}]' },
    { header: 'AcademicRequirementsMetaData', entity: 'course', field: 'requirementMetaData', parse: metaDataItems(), example: '[{"subtitle":"Entry Requirements","description":["..."]}]' },
  ],
});
