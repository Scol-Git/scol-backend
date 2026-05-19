/**
 * Maps normalized degree names (uppercase trim) to SysAcademicDegrees.levelOrder on insert.
 * Unknown keys cause the row to fail — extend this map when new degree labels appear in CSV.
 */
export const COURSE_DEGREE_LEVEL_ORDER: Record<string, number> = {
  SSC: 1,
  HSC: 2,
  BSc: 3,
  MSc: 4
};
