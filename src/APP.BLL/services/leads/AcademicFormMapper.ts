import { Injectable } from '@nestjs/common';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { SysAcademicDegrees } from '@entity/entities/SysAcademicDegrees.entity';
import { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { SysCountries } from '@entity/entities/SysCountries.entity';
import { SysProgrammes } from '@entity/entities/SysProgrammes.entity';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';
import { AcademicFormResponseDto } from '@shared/dtos/leads/AcademicFormResponseDto';
import { AcademicResultItemDto } from '@shared/dtos/leads/AcademicResultItemDto';
import { EnglishTestResultItemDto } from '@shared/dtos/leads/EnglishTestResultItemDto';
import { EnglishTestSectionItemDto } from '@shared/dtos/leads/EnglishTestSectionItemDto';
import { PreferredCountryItemDto } from '@shared/dtos/leads/PreferredCountryItemDto';
import { PreferredProgrammeItemDto } from '@shared/dtos/leads/PreferredProgrammeItemDto';

const LEVEL_ORDER_1_4 = new Set([1, 2, 3, 4]);
const DEFAULT_GPA_SCALE = 5;
const DEFAULT_MAX_SCORE = 9;

/**
 * Maps entities to Academic Form response DTO.
 * academicResults = always 4 items (system degrees levelOrder 1-4); englishTestResults = all system tests;
 * preferredCountries / preferredProgrammes = full lists with selected flag.
 */
@Injectable()
export class AcademicFormMapper {
  /**
   * Map lead profile and system data to AcademicFormResponseDto.
   */
  toAcademicFormResponse(
    leadProfile: SysLeadProfiles | null,
    academicFormStatus: AcademicFormStatus,
    systemDegrees: SysAcademicDegrees[],
    systemEnglishTests: SysEnglishTests[],
    systemCountries: SysCountries[],
    systemProgrammes: SysProgrammes[],
  ): AcademicFormResponseDto {
    const academicResults = this.mapAcademicResults(leadProfile, systemDegrees);
    const englishTestResults = this.mapEnglishTestResults(
      leadProfile,
      systemEnglishTests,
    );
    const preferredCountries = this.mapPreferredCountries(
      leadProfile,
      systemCountries,
    );
    const preferredProgrammes = this.mapPreferredProgrammes(
      leadProfile,
      systemProgrammes,
    );
    const lastAcademicInstitute = this.deriveLastAcademicInstitute(leadProfile);

    return {
      academicFormStatus,
      academicResults,
      englishTestResults,
      preferredCountries,
      preferredProgrammes,
      lastAcademicInstitute,
    };
  }

  private mapAcademicResults(
    leadProfile: SysLeadProfiles | null,
    systemDegrees: SysAcademicDegrees[],
  ): AcademicResultItemDto[] {
    const results = leadProfile?.LeadAcademicResult ?? [];
    const byDegreeId = new Map(results.map((r) => [r.degreeId, r] as const));

    return systemDegrees.map((degree) => {
      const r = byDegreeId.get(degree.id);
      const validation = this.toDegreeValidation(degree);

      if (!r) {
        return {
          degreeId: degree.id,
          degreeName: degree.degreeName,
          gpa: null,
          institute: null,
          passingDate: null,
          isEditable: true,
          validation,
        };
      }

      const gpaVal =
        r.gpa != null && String(r.gpa).trim() !== '' ? parseFloat(r.gpa) : null;
      const instituteVal =
        r.institute != null && String(r.institute).trim() !== ''
          ? r.institute
          : null;
      const passingDateVal = r.passingDate
        ? this.formatDate(r.passingDate)
        : null;
      const isEditable = this.isAcademicRowEditable(gpaVal);

      return {
        degreeId: r.degreeId,
        degreeName: degree.degreeName,
        gpa: gpaVal,
        institute: instituteVal,
        passingDate: passingDateVal,
        isEditable,
        validation,
      };
    });
  }

  /** Build validation object for a degree (gpaScale from entity or default). */
  private toDegreeValidation(degree: SysAcademicDegrees): { gpaScale: number } {
    const gpaScale = degree.gpaScale
      ? parseFloat(degree.gpaScale)
      : DEFAULT_GPA_SCALE;
    return { gpaScale };
  }

  /** Editable when no valid GPA is set (null or zero). */
  private isAcademicRowEditable(gpa: number | null): boolean {
    return gpa == null || gpa === 0;
  }

  private mapEnglishTestResults(
    leadProfile: SysLeadProfiles | null,
    systemEnglishTests: SysEnglishTests[],
  ): EnglishTestResultItemDto[] {
    const results = leadProfile?.LeadEnglishTestResult ?? [];
    const byTestId = new Map(results.map((r) => [r.sysEngTestId, r] as const));

    return systemEnglishTests.map((test) => {
      const r = byTestId.get(test.id);
      const sections = (test as any).SysEnglishTestSection ?? [];
      const validation = this.toEnglishTestValidation(test);

      if (!r) {
        return {
          testId: test.id,
          testName: test.testName,
          overallScore: null,
          testDate: null,
          isEditable: true,
          sections: sections.map((section: any) => ({
            id: section.id,
            name: section.sectionName,
            score: null,
          })),
          validation,
        };
      }

      const maxScore = test.maxScore
        ? parseFloat(test.maxScore)
        : DEFAULT_MAX_SCORE;
      const overallVal =
        r.overallScore != null && String(r.overallScore).trim() !== ''
          ? parseFloat(r.overallScore)
          : null;
      const testDateVal = r.testDate ? this.formatDate(r.testDate) : null;

      const sectionDtos: EnglishTestSectionItemDto[] = sections.map(
        (section: any) => {
          const sectionResult = (r.LeadEnglishTestSectionResult ?? []).find(
            (sr: any) => sr.sysEngTestSectionId === section.id,
          );
          const scoreVal =
            sectionResult?.sectionScore != null &&
            String(sectionResult.sectionScore).trim() !== ''
              ? parseFloat(sectionResult.sectionScore)
              : null;
          return {
            id: section.id,
            name: section.sectionName,
            score: scoreVal,
          };
        },
      );

      const isEditable = this.isEnglishTestEditable(
        overallVal,
        sectionDtos,
        maxScore,
        sections,
      );

      return {
        testId: r.sysEngTestId,
        testName: test.testName,
        overallScore: overallVal,
        testDate: testDateVal,
        isEditable,
        sections: sectionDtos,
        validation,
      };
    });
  }

  /** Build validation object for an English test (maxScore + section maxScores). */
  private toEnglishTestValidation(
    test: SysEnglishTests & {
      SysEnglishTestSection?: Array<{
        id: string;
        sectionName?: string;
        maxScore?: string;
      }>;
    },
  ): {
    maxScore: number;
    sections: Array<{ id: string; name: string; maxScore: number }>;
  } {
    const sections = test.SysEnglishTestSection ?? [];
    const maxScore = test.maxScore
      ? parseFloat(test.maxScore)
      : DEFAULT_MAX_SCORE;
    const sectionValidations = sections.map((section) => ({
      id: section.id,
      name: section.sectionName ?? '',
      maxScore: section.maxScore
        ? parseFloat(section.maxScore)
        : DEFAULT_MAX_SCORE,
    }));
    return { maxScore, sections: sectionValidations };
  }

  /**
   * Editable unless overall score and every section score are set and non-zero.
   */
  private isEnglishTestEditable(
    overallScore: number | null,
    sectionDtos: EnglishTestSectionItemDto[],
    testMaxScore: number,
    systemSections: Array<{ id: string; maxScore?: string }>,
  ): boolean {
    const overallFilled =
      overallScore != null && overallScore > 0 && overallScore <= testMaxScore;

    if (systemSections.length === 0) {
      return !overallFilled;
    }

    const allSectionsFilled = sectionDtos.every((dto) => {
      const section = systemSections.find((s) => s.id === dto.id);
      const max = section?.maxScore ? parseFloat(section.maxScore) : 9;
      const score = dto.score;
      return score != null && score > 0 && score <= max;
    });

    return !(overallFilled && allSectionsFilled);
  }

  private mapPreferredCountries(
    leadProfile: SysLeadProfiles | null,
    systemCountries: SysCountries[],
  ): PreferredCountryItemDto[] {
    const selectedIds = new Set(
      leadProfile?.LeadPreferredCountry?.map((pc) => pc.countryId) ?? [],
    );
    return systemCountries.map((c) => ({
      id: c.id,
      name: c.countryName,
      selected: selectedIds.has(c.id),
    }));
  }

  private mapPreferredProgrammes(
    leadProfile: SysLeadProfiles | null,
    systemProgrammes: SysProgrammes[],
  ): PreferredProgrammeItemDto[] {
    const selectedIds = new Set(
      leadProfile?.LeadPreferredProgram?.map((pp) => pp.programmeId) ?? [],
    );
    return systemProgrammes.map((p) => ({
      id: p.id,
      name: p.name,
      selected: selectedIds.has(p.id),
    }));
  }

  /**
   * lastAcademicInstitute = institute of the academic result whose degree has the highest levelOrder (1-4) with valid GPA. If none, null.
   */
  private deriveLastAcademicInstitute(
    leadProfile: SysLeadProfiles | null,
  ): string | null {
    const results = leadProfile?.LeadAcademicResult ?? [];
    const withDegree = results
      .map((r) => {
        const degree = (r as any).SysAcademicDegree;
        const order =
          degree?.levelOrder != null ? Number(degree.levelOrder) : null;
        if (order == null || !LEVEL_ORDER_1_4.has(order)) return null;
        const gpaScale = degree?.gpaScale ? parseFloat(degree.gpaScale) : 5;
        const gpaVal =
          r.gpa != null && String(r.gpa).trim() !== ''
            ? parseFloat(r.gpa)
            : null;
        const valid = gpaVal != null && gpaVal > 0 && gpaVal <= gpaScale;
        if (!valid) return null;
        const institute =
          r.institute != null && String(r.institute).trim() !== ''
            ? r.institute
            : null;
        return { levelOrder: order, institute };
      })
      .filter(
        (x): x is { levelOrder: number; institute: string | null } => x != null,
      );

    if (withDegree.length === 0) return null;
    const highest = withDegree.reduce((a, b) =>
      a.levelOrder > b.levelOrder ? a : b,
    );
    return highest.institute;
  }

  private formatDate(date: Date | string): string {
    if (typeof date === 'string') return date.split('T')[0];
    if (date instanceof Date) return date.toISOString().split('T')[0];
    return new Date(date).toISOString().split('T')[0];
  }
}
