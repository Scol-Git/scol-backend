import { Injectable } from '@nestjs/common';

import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { SysAcademicDegrees } from '@entity/entities/SysAcademicDegrees.entity';
import { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { SysCountries } from '@entity/entities/SysCountries.entity';
import { SysProgrammes } from '@entity/entities/SysProgrammes.entity';
import { LeadAcademicResults } from '@entity/entities/LeadAcademicResults.entity';

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

const VALID_LEVEL_ORDERS = new Set([1, 2, 3, 4]);

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

@Injectable()
export class AcademicFormMapper {
  toAcademicFormResponse(
    leadProfile: SysLeadProfiles | null,
    academicFormStatus: AcademicFormStatus,
    systemDegrees: SysAcademicDegrees[],
    systemEnglishTests: SysEnglishTests[],
    systemCountries: SysCountries[],
    systemProgrammes: SysProgrammes[],
  ): AcademicFormResponseDto {
    return {
      academicFormStatus,
      academicResults: this.mapAcademicResults(leadProfile, systemDegrees),
      englishTestResults: this.mapEnglishTestResults(
        leadProfile,
        systemEnglishTests,
      ),
      preferredCountries: this.mapPreferredCountries(
        leadProfile,
        systemCountries,
      ),
      preferredProgrammes: this.mapPreferredProgrammes(
        leadProfile,
        systemProgrammes,
      ),
      lastAcademicInstitute: this.deriveLastAcademicInstitute(leadProfile),
    };
  }

  // -------------------------------------------------------------------------
  // Academic results
  // -------------------------------------------------------------------------

  private mapAcademicResults(
    leadProfile: SysLeadProfiles | null,
    systemDegrees: SysAcademicDegrees[],
  ): AcademicResultItemDto[] {
    const byDegreeId = new Map(
      (leadProfile?.LeadAcademicResult ?? []).map((r) => [r.degreeId, r]),
    );

    return systemDegrees.map((degree) => {
      const record = byDegreeId.get(degree.id);
      const gpaScale = Number(degree.gpaScale);

      if (!record) {
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

      const gpa = this.parseNullableDecimal(record.gpa);
      const institute = this.parseNullableString(record.institute);
      const passingDate = record.passingDate
        ? this.formatDate(record.passingDate)
        : null;

      return {
        degreeId: record.degreeId,
        degreeName: degree.degreeName,
        gpa,
        institute,
        passingDate,
        isEditable: LeadProfileService.isAcademicEditable(gpa, gpaScale),
        validation: { gpaScale },
      };
    });
  }

  // -------------------------------------------------------------------------
  // English test results
  // -------------------------------------------------------------------------

  private mapEnglishTestResults(
    leadProfile: SysLeadProfiles | null,
    systemEnglishTests: SysEnglishTests[],
  ): EnglishTestResultItemDto[] {
    const byTestId = new Map(
      (
        (leadProfile?.LeadEnglishTestResult ??
          []) as EnglishTestResultWithSections[]
      ).map((r) => [r.sysEngTestId, r]),
    );

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
      (leadProfile?.LeadPreferredCountry ?? []).map((pc) => pc.countryId),
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
      (leadProfile?.LeadPreferredProgram ?? []).map((pp) => pp.programmeId),
    );
    return systemProgrammes.map((p) => ({
      id: p.id,
      name: p.name,
      selected: selectedIds.has(p.id),
    }));
  }

  // -------------------------------------------------------------------------
  // lastAcademicInstitute derivation
  // -------------------------------------------------------------------------

  /** Returns the institute of the highest levelOrder (1–4) degree row, or null if none. */
  private deriveLastAcademicInstitute(
    leadProfile: SysLeadProfiles | null,
  ): string | null {
    const validRows = (leadProfile?.LeadAcademicResult ?? []).filter((r) =>
      VALID_LEVEL_ORDERS.has(
        Number((r as LeadAcademicResults).SysAcademicDegree?.levelOrder),
      ),
    );
    const highest = LeadProfileService.findHighestLevelAcademicResult(
      validRows as LeadAcademicResults[],
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

  private parseNullableString(
    value: string | null | undefined,
  ): string | null {
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
