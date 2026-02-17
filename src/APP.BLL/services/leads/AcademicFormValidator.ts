import { Injectable, BadRequestException } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { AcademicFormRequestDto } from '@shared/dtos/leads/AcademicFormRequestDto';

/**
 * Validates academic form input data
 */
@Injectable()
export class AcademicFormValidator {
  constructor(private readonly db: AppDbContext) {}

  /**
   * Validate the entire academic form request.
   * Option A: Every PUT must include at least one valid gpa + lastAcademicInstitute (non-empty) + preferredCountryIds (non-empty, max 3) + preferredProgrammeIds (non-empty, max 3).
   */
  async validateAcademicForm(dto: AcademicFormRequestDto): Promise<void> {
    const errors: string[] = [];

    // Option A: require all four with valid values
    const degreeIds = dto.academicResults?.map((r) => r.degreeId) ?? [];
    const degrees =
      degreeIds.length > 0
        ? await this.db.academicDegrees.find({
            where: degreeIds.map((id) => ({ id })),
          })
        : [];
    const degreeMap = new Map(degrees.map((d) => [d.id, d]));
    const hasValidGpa =
      dto.academicResults?.some((r) => {
        const degree = degreeMap.get(r.degreeId);
        const scale = degree?.gpaScale ? parseFloat(degree.gpaScale) : 5;
        const gpa = r.gpa;
        return (
          gpa != null &&
          typeof gpa === 'number' &&
          gpa > 0 &&
          gpa <= scale
        );
      }) ?? false;
    const hasLastInstitute =
      dto.lastAcademicInstitute != null &&
      String(dto.lastAcademicInstitute).trim() !== '';
    const hasCountries =
      Array.isArray(dto.preferredCountryIds) &&
      dto.preferredCountryIds.length > 0 &&
      dto.preferredCountryIds.length <= 3;
    const hasProgrammes =
      Array.isArray(dto.preferredProgrammeIds) &&
      dto.preferredProgrammeIds.length > 0 &&
      dto.preferredProgrammeIds.length <= 3;

    if (!hasValidGpa) {
      errors.push(
        'At least one academic result with valid GPA (greater than 0 and within degree scale) is required',
      );
    }
    if (hasValidGpa && !hasLastInstitute) {
      errors.push(
        'lastAcademicInstitute is required and must be non-empty when at least one valid GPA is provided',
      );
    }
    if (!hasCountries) {
      errors.push(
        'preferredCountryIds is required, must be non-empty and contain at most 3 valid UUIDs',
      );
    }
    if (!hasProgrammes) {
      errors.push(
        'preferredProgrammeIds is required, must be non-empty and contain at most 3 valid UUIDs',
      );
    }

    // Validate degree IDs exist
    if (dto.academicResults?.length) {
      const degreeIds = dto.academicResults.map((r) => r.degreeId);
      const uniqueDegreeIds = [...new Set(degreeIds)];

      // Check for duplicates
      if (degreeIds.length !== uniqueDegreeIds.length) {
        errors.push('Duplicate degree entries are not allowed');
      }

      // Check degrees exist
      const existingDegrees = await this.db.academicDegrees.find({
        where: uniqueDegreeIds.map((id) => ({ id })),
      });

      const existingIds = new Set(existingDegrees.map((d) => d.id));
      const invalidIds = uniqueDegreeIds.filter((id) => !existingIds.has(id));

      if (invalidIds.length > 0) {
        errors.push(`Invalid degree IDs: ${invalidIds.join(', ')}`);
      }

      // Validate GPA against degree scale
      for (const result of dto.academicResults) {
        if (result.gpa !== undefined) {
          const degree = existingDegrees.find((d) => d.id === result.degreeId);
          if (degree?.gpaScale) {
            const scale = parseFloat(degree.gpaScale);
            if (result.gpa > scale) {
              errors.push(
                `GPA ${result.gpa} exceeds maximum scale ${scale} for degree ${degree.degreeName}`,
              );
            }
          }
        }
      }
    }

    // Validate English test IDs exist
    if (dto.englishTestResults?.length) {
      const testIds = dto.englishTestResults.map((r) => r.testId);
      const uniqueTestIds = [...new Set(testIds)];

      // Check for duplicates
      if (testIds.length !== uniqueTestIds.length) {
        errors.push('Duplicate English test entries are not allowed');
      }

      // Check tests exist
      const existingTests = await this.db.englishTests.find({
        where: uniqueTestIds.map((id) => ({ id })),
        relations: { SysEnglishTestSection: true },
      });

      const existingTestIds = new Set(existingTests.map((t) => t.id));
      const invalidTestIds = uniqueTestIds.filter((id) => !existingTestIds.has(id));

      if (invalidTestIds.length > 0) {
        errors.push(`Invalid English test IDs: ${invalidTestIds.join(', ')}`);
      }

      // Validate section IDs for each test
      for (const testResult of dto.englishTestResults) {
        const test = existingTests.find((t) => t.id === testResult.testId);
        if (test && testResult.sections?.length) {
          const validSectionIds = new Set(test.SysEnglishTestSection.map((s: any) => s.id));

          for (const section of testResult.sections) {
            if (!validSectionIds.has(section.id)) {
              errors.push(
                `Invalid section ID ${section.id} for test ${test.testName}`,
              );
            }
          }
        }
      }
    }

    // Validate country IDs exist
    if (dto.preferredCountryIds?.length) {
      const uniqueCountryIds = [...new Set(dto.preferredCountryIds)];

      if (dto.preferredCountryIds.length !== uniqueCountryIds.length) {
        errors.push('Duplicate country selections are not allowed');
      }

      const existingCountries = await this.db.countries.find({
        where: uniqueCountryIds.map((id) => ({ id })),
      });

      const existingCountryIds = new Set(existingCountries.map((c) => c.id));
      const invalidCountryIds = uniqueCountryIds.filter(
        (id) => !existingCountryIds.has(id),
      );

      if (invalidCountryIds.length > 0) {
        errors.push(`Invalid country IDs: ${invalidCountryIds.join(', ')}`);
      }
    }

    // Validate programme IDs exist
    if (dto.preferredProgrammeIds?.length) {
      const uniqueProgrammeIds = [...new Set(dto.preferredProgrammeIds)];

      if (dto.preferredProgrammeIds.length !== uniqueProgrammeIds.length) {
        errors.push('Duplicate programme selections are not allowed');
      }

      const existingProgrammes = await this.db.programmes.find({
        where: uniqueProgrammeIds.map((id) => ({ id })),
      });

      const existingProgrammeIds = new Set(existingProgrammes.map((p) => p.id));
      const invalidProgrammeIds = uniqueProgrammeIds.filter(
        (id) => !existingProgrammeIds.has(id),
      );

      if (invalidProgrammeIds.length > 0) {
        errors.push(`Invalid programme IDs: ${invalidProgrammeIds.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }
}
