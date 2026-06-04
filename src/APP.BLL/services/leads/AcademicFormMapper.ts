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
import { LeadProfileService } from './LeadProfileService';

// ---------------------------------------------------------------------------
// Extended entity types (sections are loaded at runtime via relations)
// ---------------------------------------------------------------------------

type EnglishTestWithSections = SysEnglishTests & {
  SysEnglishTestSection?: Array<{
    id: string;
    sectionName?: string;
    maxScore?: string;
  }>;
};

type EnglishTestResultWithSections = {
  id: string;
  sysEngTestId: string;
  overallScore?: string | null;
  testDate?: Date | null;
  LeadEnglishTestSectionResult?: Array<{
    sysEngTestSectionId: string;
    sectionScore?: string | null;
  }>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
      lastAcademicInstitute,
      englishTestResults,
      preferredCountries,
      preferredProgrammes,
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
      const gpaScale = Number(degree.gpaScale);

      if (!r) {
        return {
          degreeId: degree.id,
          degreeName: degree.degreeName,
          gpa: null,
          institute: null,
          passingDate: null,
          isEditable: true,
          validation: { gpaScale },
        };
      }

      const gpa = this.parseNullableDecimal(r.gpa);
      const institute = this.parseNullableString(r.institute);
      const passingDate = r.passingDate ? this.formatDate(r.passingDate) : null;

      return {
        degreeId: r.degreeId,
        degreeName: degree.degreeName,
        gpa,
        institute,
        passingDate,
        isEditable: LeadProfileService.isAcademicEditable(gpa, gpaScale),
        validation: { gpaScale },
      };
    });
  }

  // English test results

  private mapEnglishTestResults(
    leadProfile: SysLeadProfiles | null,
    systemEnglishTests: SysEnglishTests[],
  ): EnglishTestResultItemDto[] {
    //const results = leadProfile?.LeadEnglishTestResult ?? [];
    //const byTestId = new Map(results.map((r) => [r.sysEngTestId, r] as const));

    const byTestId = new Map(
      (
        (leadProfile?.LeadEnglishTestResult ??
          []) as EnglishTestResultWithSections[]
      ).map((r) => [r.sysEngTestId, r]),
    );

    // return systemEnglishTests.map((test) => {
    //   const r = byTestId.get(test.id);
    //   const sections = (test as any).SysEnglishTestSection ?? [];
    //   const validation = this.toEnglishTestValidation(test);
    return (systemEnglishTests as EnglishTestWithSections[]).map((test) => {
      const sections = test.SysEnglishTestSection ?? [];
      const maxScore = Number(test.maxScore);
      const validation = {
        maxScore,
        sections: sections.map((s) => ({
          id: s.id,
          name: s.sectionName ?? '',
          maxScore: Number(s.maxScore),
        })),
      };

      const record = byTestId.get(test.id);

      if (!record) {
        return {
          testId: test.id,
          testName: test.testName,
          overallScore: null,
          testDate: null,
          isEditable: true,
          sections: sections.map((s) => ({
            id: s.id,
            name: s.sectionName ?? '',
            score: null,
          })),
          validation,
        };
      }

      const overallScore = this.parseNullableDecimal(record.overallScore);
      const testDate = record.testDate
        ? this.formatDate(record.testDate)
        : null;

      const sectionDtos: EnglishTestSectionItemDto[] = sections.map(
        (section) => {
          const sectionResult = (
            record.LeadEnglishTestSectionResult ?? []
          ).find((sr) => sr.sysEngTestSectionId === section.id);

          return {
            id: section.id,
            name: section.sectionName ?? '',
            score: this.parseNullableDecimal(sectionResult?.sectionScore),
          };
        },
      );

      const isEditable = LeadProfileService.isEnglishTestEditable(
        overallScore,
        maxScore,
        sectionDtos.map((dto) => ({
          score: dto.score,
          maxScore:
            validation.sections.find((s) => s.id === dto.id)?.maxScore ?? 0,
        })),
      );

      return {
        testId: record.sysEngTestId,
        testName: test.testName,
        overallScore,
        testDate,
        isEditable,
        sections: sectionDtos,
        validation,
      };
    });
  }

  // -------------------------------------------------------------------------
  // Preferred countries / programmes
  // -------------------------------------------------------------------------

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
    const highest = LeadProfileService.findHighestLevelAcademicResult(
      leadProfile?.LeadAcademicResult ?? [],
    );
    return this.parseNullableString(highest?.institute);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private parseNullableDecimal(
    value: string | null | undefined,
  ): number | null {
    if (value == null || String(value).trim() === '') return null;
    return parseFloat(value);
  }

  private parseNullableString(value: string | null | undefined): string | null {
    if (value == null || String(value).trim() === '') return null;
    return value;
  }
  private formatDate(date: Date | string): string {
    if (typeof date === 'string') return date.split('T')[0];
    return (date instanceof Date ? date : new Date(date))
      .toISOString()
      .split('T')[0];
  }
}
