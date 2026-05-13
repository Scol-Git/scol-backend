import type { CsvImportSchema } from '../common/abstractions/CsvImportSchema';

/** Matches [sys_course_details_template.csv](sys_course_details_template.csv) header row. */
const INPUT_HEADERS = [
  'uniName',
  'programmeName',
  'degreeName',
  'courseName',
  'minDegreeName',
  'minGpa',
  'higherDegreeName',
  'higherGpa',
  'AcademicRequirementsMetaData',
  'intakeInfo',
  'courseDuration',
  'tuitionFee',
  'currency',
  'initialDeposit',
  'applicationFee',
  'feesMetaData',
  'applicationDeadline',
  'ieltsMinOverall',
  'ieltsMinSection',
  'toeflMinOverall',
  'toeflMinSection',
  'pteMinOverall',
  'pteMinSection',
  'scholarshipName',
  'scholarshipAmount',
  'scholarshipType',
  'scholarshipMetaData',
  'courseUrlExternal',
] as const;

/** Resolved FK IDs written after successful import (audit / downstream joins). */
const REVIEWED_ID_HEADERS = [
  'uniId',
  'sysProgrammeId',
  'sysDegreeId',
  'minSysDegreeId',
  'higherSysDegreeId',
  'uniCourseId',
  'courseIntakeId',
  'sysEngTestIdIelts',
  'courseEngReqIdIelts',
  'sysEngTestIdToefl',
  'courseEngReqIdToefl',
  'sysEngTestIdPte',
  'courseEngReqIdPte',
  'scholarshipId',
] as const;

const REVIEWED_HEADERS = [...INPUT_HEADERS, ...REVIEWED_ID_HEADERS];

const ERROR_HEADERS = [...INPUT_HEADERS, 'errorReason'];

export const CourseImportSchema: CsvImportSchema = {
  inputHeaders: [...INPUT_HEADERS],
  reviewedHeaders: [...REVIEWED_HEADERS],
  errorHeaders: [...ERROR_HEADERS],
};
