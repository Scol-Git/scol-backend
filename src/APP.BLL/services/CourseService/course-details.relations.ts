/**
 * Relations needed to build course details + meta + eligibility from intake.
 */
export const COURSE_DETAILS_RELATIONS = {
  UniCourse: {
    SysUniversity: {
      SysCountry: true,
      SysState: true,
      SysCity: true,
    },
    CourseEngReq: {
      SysEnglishTest: {
        SysEnglishTestSection: true,
      },
    },
    SysProgramme: true,
    SysAcademicDegree: true,
    minSysAcademicDegree: true,
    higherSysAcademicDegree: true,
  },
} as const;
