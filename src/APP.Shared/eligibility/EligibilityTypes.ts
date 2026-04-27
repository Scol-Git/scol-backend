export type DegreeId = string;
export type EnglishTestId = string;

export interface AcademicResult {
  gpa?: number;
}

export interface EnglishSectionScore {
  sectionId: string;
  score: number;
}

export interface EnglishTestResult {
  overallScore: number;
  sectionScores: EnglishSectionScore[];
}

export interface NormalizedEligibilityProfile {
  leadId: string;

  academicResultsByDegreeId: Map<DegreeId, AcademicResult>;
  englishResultsByTestId: Map<EnglishTestId, EnglishTestResult>;
}

export interface CourseEligibilityResult {
  isEligible: boolean;
  isAcademicEligible: boolean;
  isEnglishEligible: boolean;
  reasons: string[];
}
