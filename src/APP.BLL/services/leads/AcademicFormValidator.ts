import { Injectable, BadRequestException } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { AcademicFormRequestDto } from '@shared/dtos/leads/AcademicFormRequestDto';
import type { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';

/** Only degrees with these level orders are accepted for academic results. */
const LEVEL_ORDER_1_4 = new Set([1, 2, 3, 4]);

const DEFAULT_GPA_SCALE = 5;
const DEFAULT_MAX_SCORE = 9;

const PREFERRED_MAX_ITEMS = 3;

/**
 * Validates academic form input data.
 * All fields are optional; when provided, entries must be valid (update/add only).
 */
@Injectable()
export class AcademicFormValidator {
  constructor(private readonly db: AppDbContext) {}

  /**
   * Validates the entire academic form request.
   * Throws BadRequestException with an array of error messages when invalid.
   */
  async validateAcademicForm(dto: AcademicFormRequestDto): Promise<void> {
    const errors: string[] = [];

    this.validateGpaInstitutePair(dto, errors);
    await this.validateAcademicResults(dto, errors);
    await this.validateEnglishTestResults(dto, errors);
    await this.validatePreferredCountries(dto, errors);
    await this.validatePreferredProgrammes(dto, errors);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }

  /**
   * academicResults and lastAcademicInstitute must be sent together (non-empty institute).
   */
  private validateGpaInstitutePair(
    dto: AcademicFormRequestDto,
    errors: string[],
  ): void {
    const hasAcademicResults =
      Array.isArray(dto.academicResults) && dto.academicResults.length > 0;

    const hasLastInstitute =
      dto.lastAcademicInstitute != null &&
      String(dto.lastAcademicInstitute).trim() !== '';

    if (hasAcademicResults !== hasLastInstitute) {
      errors.push(
        'academicResults and lastAcademicInstitute must be provided together',
      );
    }
  }

  /**
   * Academic results: no duplicates; each degreeId must exist and have levelOrder 1–4;
   * each entry must have gpa not null, > 0, and within degree gpaScale.
   */
  private async validateAcademicResults(
    dto: AcademicFormRequestDto,
    errors: string[],
  ): Promise<void> {
    if (!dto.academicResults?.length) return;

    const degreeIds = dto.academicResults.map((r) => r.degreeId);
    const uniqueDegreeIds = [...new Set(degreeIds)];

    if (degreeIds.length !== uniqueDegreeIds.length) {
      errors.push('Duplicate degree entries are not allowed');
    }

    const degrees = await this.db.academicDegrees.find({
      where: uniqueDegreeIds.map((id) => ({ id })),
    });
    const degreeMap = new Map(degrees.map((d) => [d.id, d]));

    const invalidDegreeIds = uniqueDegreeIds.filter((id) => !degreeMap.has(id));
    if (invalidDegreeIds.length > 0) {
      errors.push(`Invalid degree IDs: ${invalidDegreeIds.join(', ')}`);
    }

    for (const result of dto.academicResults) {
      const degree = degreeMap.get(result.degreeId);
      if (!degree) continue;

      if (!LEVEL_ORDER_1_4.has(degree.levelOrder)) {
        errors.push(
          `Degree ${degree.degreeName} (levelOrder ${degree.levelOrder}) is not allowed; only levelOrder 1–4 are accepted`,
        );
        continue;
      }

      const scale = degree.gpaScale
        ? parseFloat(degree.gpaScale)
        : DEFAULT_GPA_SCALE;
      const gpa = result.gpa;

      if (gpa == null || typeof gpa !== 'number') {
        errors.push(
          `GPA is required for degree ${degree.degreeName} (degreeId: ${result.degreeId})`,
        );
      } else if (gpa <= 0) {
        errors.push(
          `GPA must be greater than 0 for degree ${degree.degreeName} (received ${gpa})`,
        );
      } else if (gpa > scale) {
        errors.push(
          `GPA ${gpa} exceeds maximum scale ${scale} for degree ${degree.degreeName}`,
        );
      }
    }
  }

  /**
   * English test results: no duplicates; each testId must exist;
   * overallScore required, > 0, within test maxScore;
   * when test has sections in DB, all section ids must be present with score > 0 and within section maxScore.
   */
  private async validateEnglishTestResults(
    dto: AcademicFormRequestDto,
    errors: string[],
  ): Promise<void> {
    if (!dto.englishTestResults?.length) return;

    const testIds = dto.englishTestResults.map((r) => r.testId);
    const uniqueTestIds = [...new Set(testIds)];

    if (testIds.length !== uniqueTestIds.length) {
      errors.push('Duplicate English test entries are not allowed');
    }

    const tests = await this.db.englishTests.find({
      where: uniqueTestIds.map((id) => ({ id })),
      relations: { SysEnglishTestSection: true },
    });
    const testMap = new Map(tests.map((t) => [t.id, t]));

    const invalidTestIds = uniqueTestIds.filter((id) => !testMap.has(id));
    if (invalidTestIds.length > 0) {
      errors.push(`Invalid English test IDs: ${invalidTestIds.join(', ')}`);
    }

    for (const result of dto.englishTestResults) {
      const test = testMap.get(result.testId) as (typeof tests)[0] | undefined;
      if (!test) continue;

      const testMaxScore = test.maxScore
        ? parseFloat(test.maxScore)
        : DEFAULT_MAX_SCORE;
      const overall = result.overallScore;

      if (overall == null || typeof overall !== 'number') {
        errors.push(
          `Overall score is required for test ${test.testName} (testId: ${result.testId})`,
        );
      } else if (overall <= 0) {
        errors.push(
          `Overall score must be greater than 0 for test ${test.testName} (received ${overall})`,
        );
      } else if (overall > testMaxScore) {
        errors.push(
          `Overall score ${overall} exceeds maximum ${testMaxScore} for test ${test.testName}`,
        );
      }

      const sections =
        (
          test as SysEnglishTests & {
            SysEnglishTestSection?: Array<{ id: string; maxScore?: string }>;
          }
        ).SysEnglishTestSection ?? [];
      if (sections.length === 0) continue;

      const requiredSectionIds = new Set(sections.map((s) => s.id));
      const providedSections = result.sections ?? [];

      for (const sectionId of requiredSectionIds) {
        const section = sections.find((s) => s.id === sectionId);
        const sectionMax = section?.maxScore
          ? parseFloat(section.maxScore)
          : DEFAULT_MAX_SCORE;
        const provided = providedSections.find((s) => s.id === sectionId);

        if (!provided) {
          errors.push(
            `Section ${sectionId} is required for test ${test.testName}; all section scores must be provided when the test has sections`,
          );
        } else {
          const score = provided.score;
          if (score == null || typeof score !== 'number') {
            errors.push(
              `Score is required for section ${sectionId} of test ${test.testName}`,
            );
          } else if (score <= 0) {
            errors.push(
              `Section score must be greater than 0 for section ${sectionId} of test ${test.testName} (received ${score})`,
            );
          } else if (score > sectionMax) {
            errors.push(
              `Section score ${score} exceeds maximum ${sectionMax} for section ${sectionId} of test ${test.testName}`,
            );
          }
        }
      }

      const invalidSectionIds = providedSections
        .map((s) => s.id)
        .filter((id) => !requiredSectionIds.has(id));
      if (invalidSectionIds.length > 0) {
        errors.push(
          `Invalid section ID(s) for test ${test.testName}: ${invalidSectionIds.join(', ')}`,
        );
      }
    }
  }

  /**
   * Preferred countries: when provided, no duplicates, IDs must exist, max 3.
   */
  private async validatePreferredCountries(
    dto: AcademicFormRequestDto,
    errors: string[],
  ): Promise<void> {
    if (!dto.preferredCountryIds?.length) return;

    const ids = dto.preferredCountryIds;
    const uniqueIds = [...new Set(ids)];

    if (ids.length !== uniqueIds.length) {
      errors.push('Duplicate country selections are not allowed');
    }
    if (uniqueIds.length > PREFERRED_MAX_ITEMS) {
      errors.push(
        `preferredCountryIds must contain at most ${PREFERRED_MAX_ITEMS} items`,
      );
    }

    const existing = await this.db.countries.find({
      where: uniqueIds.map((id) => ({ id })),
    });
    const existingIds = new Set(existing.map((c) => c.id));
    const invalidIds = uniqueIds.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      errors.push(`Invalid country IDs: ${invalidIds.join(', ')}`);
    }
  }

  /**
   * Preferred programmes: when provided, no duplicates, IDs must exist, max 3.
   */
  private async validatePreferredProgrammes(
    dto: AcademicFormRequestDto,
    errors: string[],
  ): Promise<void> {
    if (!dto.preferredProgrammeIds?.length) return;

    const ids = dto.preferredProgrammeIds;
    const uniqueIds = [...new Set(ids)];

    if (ids.length !== uniqueIds.length) {
      errors.push('Duplicate programme selections are not allowed');
    }
    if (uniqueIds.length > PREFERRED_MAX_ITEMS) {
      errors.push(
        `preferredProgrammeIds must contain at most ${PREFERRED_MAX_ITEMS} items`,
      );
    }

    const existing = await this.db.programmes.find({
      where: uniqueIds.map((id) => ({ id })),
    });
    const existingIds = new Set(existing.map((p) => p.id));
    const invalidIds = uniqueIds.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      errors.push(`Invalid programme IDs: ${invalidIds.join(', ')}`);
    }
  }
}
