import { Injectable } from '@nestjs/common';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { SysAcademicDegrees } from '@entity/entities/SysAcademicDegrees.entity';
import { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { SysCountries } from '@entity/entities/SysCountries.entity';
import { SysProgrammes } from '@entity/entities/SysProgrammes.entity';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';
import { AcademicFormResponseDto } from '@shared/dtos/leads/AcademicFormResponseDto';
import { DegreeResponseDto, DegreeValidationDto } from '@shared/dtos/leads/DegreeResponseDto';
import {
  EnglishTestResponseDto,
  EnglishTestSectionScoreDto,
  EnglishTestValidationDto,
  EnglishTestSectionValidationDto,
} from '@shared/dtos/leads/EnglishTestResponseDto';
import { SelectableItemDto } from '@shared/dtos/leads/SelectableItemDto';

/**
 * Maps entities to Academic Form response DTOs
 */
@Injectable()
export class AcademicFormMapper {
  /**
   * Map all data to AcademicFormResponseDto
   */
  toAcademicFormResponse(
    leadProfile: SysLeadProfiles | null,
    allDegrees: SysAcademicDegrees[],
    allEnglishTests: SysEnglishTests[],
    allCountries: SysCountries[],
    allProgrammes: SysProgrammes[],
    academicFormStatus: AcademicFormStatus,
  ): AcademicFormResponseDto {
    // Map degrees
    const degrees = this.mapDegrees(allDegrees, leadProfile);

    // Map English tests
    const englishTests = this.mapEnglishTests(allEnglishTests, leadProfile);

    // Map preferred countries
    const preferredCountries = this.mapCountries(
      allCountries,
      leadProfile?.LeadPreferredCountry?.map((pc) => pc.countryId) ?? [],
    );

    // Map preferred programs
    const preferredPrograms = this.mapProgrammes(
      allProgrammes,
      leadProfile?.LeadPreferredProgram?.map((pp) => pp.programmeId) ?? [],
    );

    return {
      academicFormStatus,
      degrees,
      englishTests,
      preferredCountries,
      preferredPrograms,
    };
  }

  /**
   * Map degrees with user's saved values
   */
  private mapDegrees(
    allDegrees: SysAcademicDegrees[],
    leadProfile: SysLeadProfiles | null,
  ): DegreeResponseDto[] {
    return allDegrees.map((degree) => {
      // Find user's result for this degree
      const userResult = leadProfile?.LeadAcademicResult?.find(
        (r) => r.degreeId === degree.id,
      );

      const validation: DegreeValidationDto = {
        gpaScale: degree.gpaScale ? parseFloat(degree.gpaScale) : 5,
      };

      return {
        degreeId: degree.id,
        name: degree.degreeName,
        gpa: userResult?.gpa ? parseFloat(userResult.gpa) : undefined,
        institute: userResult?.institute || undefined,
        passingDate: userResult?.passingDate
          ? this.formatDate(userResult.passingDate)
          : undefined,
        validation,
      };
    });
  }

  /**
   * Map English tests with user's saved values
   */
  private mapEnglishTests(
    allTests: SysEnglishTests[],
    leadProfile: SysLeadProfiles | null,
  ): EnglishTestResponseDto[] {
    return allTests.map((test) => {
      // Find user's result for this test
      const userResult = leadProfile?.LeadEnglishTestResult?.find(
        (r) => r.sysEngTestId === test.id,
      );

      // Map sections with scores (use SysEnglishTestSection navigation property)
      const sections: EnglishTestSectionScoreDto[] = (test.SysEnglishTestSection ?? []).map(
        (section) => {
          const userSectionResult = userResult?.LeadEnglishTestSectionResult?.find(
            (sr) => sr.sysEngTestSectionId === section.id,
          );

          return {
            id: section.id,
            name: section.sectionName,
            score: userSectionResult?.sectionScore
              ? parseFloat(userSectionResult.sectionScore)
              : undefined,
          };
        },
      );

      // Build validation
      const validation: EnglishTestValidationDto = {
        maxScore: test.maxScore ? parseFloat(test.maxScore) : 9,
        sections: (test.SysEnglishTestSection ?? []).map(
          (section): EnglishTestSectionValidationDto => ({
            id: section.id,
            name: section.sectionName,
            maxScore: section.maxScore ? parseFloat(section.maxScore) : 9,
          }),
        ),
      };

      return {
        testId: test.id,
        testName: test.testName,
        overallScore: userResult?.overallScore
          ? parseFloat(userResult.overallScore)
          : undefined,
        testDate: userResult?.testDate
          ? this.formatDate(userResult.testDate)
          : undefined,
        sections,
        validation,
      };
    });
  }

  /**
   * Map countries with selection state
   */
  private mapCountries(
    allCountries: SysCountries[],
    selectedIds: string[],
  ): SelectableItemDto[] {
    const selectedSet = new Set(selectedIds);

    return allCountries.map((country) => ({
      id: country.id,
      name: country.countryName,
      selected: selectedSet.has(country.id),
    }));
  }

  /**
   * Map programmes with selection state
   */
  private mapProgrammes(
    allProgrammes: SysProgrammes[],
    selectedIds: string[],
  ): SelectableItemDto[] {
    const selectedSet = new Set(selectedIds);

    return allProgrammes.map((programme) => ({
      id: programme.id,
      name: programme.name,
      selected: selectedSet.has(programme.id),
    }));
  }

  /**
   * Format date to ISO string (YYYY-MM-DD)
   *
   * Handles both Date objects and string values from database.
   * Some database drivers return date columns as strings.
   */
  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      // Already a string - extract date part if it's ISO format
      return date.split('T')[0];
    }
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    // Fallback: try to parse as date
    return new Date(date).toISOString().split('T')[0];
  }
}
