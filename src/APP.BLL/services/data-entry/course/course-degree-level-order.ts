/**
 * Maps normalized degree names (uppercase trim) to SysAcademicDegrees.levelOrder on insert.
 * Unknown keys cause the row to fail — extend this map when new degree labels appear in CSV.
 */
export const COURSE_DEGREE_LEVEL_ORDER: Record<string, number> = {
  HSC: 1,
  'A-LEVEL': 1,
  ALEVEL: 1,
  DIPLOMA: 2,
  AD: 2,
  BA: 3,
  BSC: 3,
  BENG: 3,
  LLB: 3,
  BBA: 3,
  MA: 4,
  MSC: 4,
  MBA: 4,
  MENG: 4,
  LLM: 4,
  MRES: 4,
  PHD: 5,
  DPHIL: 5,
};
