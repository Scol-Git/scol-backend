/**
 * Maps normalized degree names (uppercase trim) to SysAcademicDegrees.levelOrder on insert.
 * Unknown keys cause the row to fail — extend this map when new degree labels appear in CSV.
 */
export const COURSE_DEGREE_LEVEL_ORDER: Record<string, number> = {
  HSC: 10,
  'A-LEVEL': 15,
  ALEVEL: 15,
  DIPLOMA: 20,
  AD: 22,
  BA: 30,
  BSC: 30,
  BENG: 30,
  LLB: 30,
  BBA: 30,
  MA: 40,
  MSC: 40,
  MBA: 40,
  MENG: 40,
  LLM: 40,
  MRES: 42,
  PHD: 50,
  DPHIL: 50,
};
