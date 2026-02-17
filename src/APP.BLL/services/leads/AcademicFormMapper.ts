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
    const academicResults = this.mapAcademicResults(
      leadProfile,
      systemDegrees,
    );
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
    const byDegreeId = new Map(
      results.map((r) => [r.degreeId, r] as const),
    );

    return systemDegrees.map((degree) => {
      const r = byDegreeId.get(degree.id);
      if (!r) {
        return {
          degreeId: degree.id,
          degreeName: degree.degreeName,
          gpa: null,
          institute: null,
          passingDate: null,
          gpaFilled: false,
          instituteFilled: false,
          passingDateFilled: false,
        };
      }
      const gpaScale = degree.gpaScale
        ? parseFloat(degree.gpaScale)
        : 5;
      const gpaVal =
        r.gpa != null && String(r.gpa).trim() !== ''
          ? parseFloat(r.gpa)
          : null;
      const validGpa =
        gpaVal != null && gpaVal > 0 && gpaVal <= gpaScale;
      const instituteVal =
        r.institute != null && String(r.institute).trim() !== ''
          ? r.institute
          : null;
      const passingDateVal = r.passingDate
        ? this.formatDate(r.passingDate)
        : null;

      return {
        degreeId: r.degreeId,
        degreeName: degree.degreeName,
        gpa: gpaVal,
        institute: instituteVal,
        passingDate: passingDateVal,
        gpaFilled: validGpa,
        instituteFilled: instituteVal != null,
        passingDateFilled: passingDateVal != null,
      };
    });
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

      if (!r) {
        return {
          testId: test.id,
          testName: test.testName,
          overallScore: null,
          testDate: null,
          overallScoreFilled: false,
          testDateFilled: false,
          sections: sections.map((section: any) => ({
            id: section.id,
            name: section.sectionName,
            score: null,
            scoreFilled: false,
          })),
        };
      }

      const maxScore = test.maxScore ? parseFloat(test.maxScore) : 9;
      const overallVal =
        r.overallScore != null && String(r.overallScore).trim() !== ''
          ? parseFloat(r.overallScore)
          : null;
      const validOverall =
        overallVal != null && overallVal > 0 && overallVal <= maxScore;
      const testDateVal = r.testDate
        ? this.formatDate(r.testDate)
        : null;

      const sectionDtos: EnglishTestSectionItemDto[] = sections.map(
        (section: any) => {
          const sectionResult = (r.LeadEnglishTestSectionResult ?? []).find(
            (sr: any) => sr.sysEngTestSectionId === section.id,
          );
          const sectionMax = section?.maxScore
            ? parseFloat(section.maxScore)
            : 9;
          const scoreVal =
            sectionResult?.sectionScore != null &&
            String(sectionResult.sectionScore).trim() !== ''
              ? parseFloat(sectionResult.sectionScore)
              : null;
          const validScore =
            scoreVal != null && scoreVal > 0 && scoreVal <= sectionMax;
          return {
            id: section.id,
            name: section.sectionName,
            score: scoreVal,
            scoreFilled: validScore,
          };
        },
      );

      return {
        testId: r.sysEngTestId,
        testName: test.testName,
        overallScore: overallVal,
        testDate: testDateVal,
        overallScoreFilled: validOverall,
        testDateFilled: testDateVal != null,
        sections: sectionDtos,
      };
    });
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
        const gpaScale = degree?.gpaScale
          ? parseFloat(degree.gpaScale)
          : 5;
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
