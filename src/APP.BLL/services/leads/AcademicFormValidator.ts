import { Injectable, BadRequestException } from '@nestjs/common';
import { In } from 'typeorm';

import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { AcademicFormRequestDto } from '@shared/dtos/leads/AcademicFormRequestDto';
import type { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';

const VALID_LEVEL_ORDERS = new Set([1, 2, 3, 4]);

type EnglishTestWithSections = SysEnglishTests & {
  SysEnglishTestSection?: Array<{
    id: string;
    sectionName?: string;
    maxScore?: string;
  }>;
};

/**
 * Validates academic form input.
 * All top-level sections are optional; when provided each entry must satisfy its DB constraints.
 * English tests with DB sections require overall score and every section score.
 */
@Injectable()
export class AcademicFormValidator {
  constructor(private readonly db: AppDbContext) {}

  async validateAcademicForm(dto: AcademicFormRequestDto): Promise<void> {
    const errors: string[] = [];

    this.validateAcademicInstitutePairing(dto, errors);
    await this.validateAcademicResults(dto, errors);
    await this.validateEnglishTestResults(dto, errors);
    await this.validatePreferredIds(
      'country',
      dto.preferredCountryIds,
      () =>
        this.db.countries.find({
          where: dto.preferredCountryIds!.map((id) => ({ id })),
        }),
      errors,
    );
    await this.validatePreferredIds(
      'programme',
      dto.preferredProgrammeIds,
      () =>
        this.db.programmes.find({
          where: dto.preferredProgrammeIds!.map((id) => ({ id })),
        }),
      errors,
    );

    if (errors.length > 0) throw new BadRequestException(errors);
  }

  // -------------------------------------------------------------------------
  // Academic — pairing rule
  // -------------------------------------------------------------------------

  /** academicResults and lastAcademicInstitute must be provided together. */
  private validateAcademicInstitutePairing(
    dto: AcademicFormRequestDto,
    errors: string[],
  ): void {
    const hasResults =
      Array.isArray(dto.academicResults) && dto.academicResults.length > 0;
    const hasInstitute =
      dto.lastAcademicInstitute != null &&
      String(dto.lastAcademicInstitute).trim() !== '';

    if (hasResults !== hasInstitute) {
      errors.push(
        'academicResults and lastAcademicInstitute must be provided together',
      );
    }
  }

  // -------------------------------------------------------------------------
  // Academic results
  // -------------------------------------------------------------------------

  private async validateAcademicResults(
    dto: AcademicFormRequestDto,
    errors: string[],
  ): Promise<void> {
    if (!dto.academicResults?.length) return;

    const degreeIds = dto.academicResults.map((r) => r.degreeId);
    const uniqueDegreeIds = [...new Set(degreeIds)];

    if (degreeIds.length !== uniqueDegreeIds.length) {
      errors.push('Duplicate degree entries are not allowed');
      return;
    }

    const degrees = await this.db.academicDegrees.find({
      where: uniqueDegreeIds.map((id) => ({
        id,
        levelOrder: In([...VALID_LEVEL_ORDERS]),
      })),
    });
    const degreeMap = new Map(degrees.map((d) => [d.id, d]));

    const invalidIds = uniqueDegreeIds.filter((id) => !degreeMap.has(id));
    if (invalidIds.length > 0) {
      errors.push(`Invalid degree IDs: ${invalidIds.join(', ')}`);
      return;
    }

    for (const result of dto.academicResults) {
      const degree = degreeMap.get(result.degreeId)!;

      if (!degree.gpaScale) {
        throw new Error(
          `Degree ${degree.degreeName} has no gpaScale configured`,
        );
      }
      const scale = parseFloat(degree.gpaScale);
      if (isNaN(scale)) {
        throw new Error(
          `Degree ${degree.degreeName} has invalid gpaScale: ${degree.gpaScale}`,
        );
      }

      if (result.gpa == null) {
        errors.push(`GPA is required for ${degree.degreeName}`);
      } else if (result.gpa <= 0) {
        errors.push(
          `GPA must be > 0 for ${degree.degreeName} (received ${result.gpa})`,
        );
      } else if (result.gpa > scale) {
        errors.push(
          `GPA ${result.gpa} exceeds scale ${scale} for ${degree.degreeName}`,
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // English test results
  // -------------------------------------------------------------------------

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

    const tests = (await this.db.englishTests.find({
      where: uniqueTestIds.map((id) => ({ id })),
      relations: { SysEnglishTestSection: true },
    })) as EnglishTestWithSections[];

    const testMap = new Map(tests.map((t) => [t.id, t]));

    const invalidTestIds = uniqueTestIds.filter((id) => !testMap.has(id));
    if (invalidTestIds.length > 0) {
      errors.push(
        'Unknown English test — use testId from GET /leads/profile/academic-form',
      );
    }

    for (const result of dto.englishTestResults) {
      const test = testMap.get(result.testId);
      if (!test) continue;

      if (!test.maxScore) {
        throw new Error(
          `English test ${test.testName} has no maxScore configured`,
        );
      }
      const testMaxScore = parseFloat(test.maxScore);
      const overall = result.overallScore;

      const testName = test.testName ?? 'English test';
      if (overall == null || typeof overall !== 'number') {
        errors.push(`${testName}: overall score is required`);
      } else if (overall <= 0) {
        errors.push(
          `${testName}: overall score must be greater than 0 (received ${overall})`,
        );
      } else if (overall > testMaxScore) {
        errors.push(
          `${testName}: overall score ${overall} exceeds maximum ${testMaxScore}`,
        );
      }

      this.validateEnglishTestSections(test, result.sections ?? [], errors);
    }
  }

  /**
   * When the test has sections in DB, every section id must be present with a valid score.
   */
  private validateEnglishTestSections(
    test: EnglishTestWithSections,
    providedSections: Array<{ id: string; score: number }>,
    errors: string[],
  ): void {
    const sections = test.SysEnglishTestSection ?? [];
    if (sections.length === 0) return;

    const testName = test.testName ?? 'English test';
    const requiredSectionIds = new Set(sections.map((s) => s.id));

    for (const sectionId of requiredSectionIds) {
      const section = sections.find((s) => s.id === sectionId)!;
      if (!section.maxScore) {
        throw new Error(
          `${testName} ${this.sectionLabel(section)} has no maxScore configured`,
        );
      }
      const sectionMax = parseFloat(section.maxScore);
      const label = this.sectionLabel(section);
      const provided = providedSections.find((s) => s.id === sectionId);

      if (!provided) {
        errors.push(
          `${testName}: ${label} is required; all section scores must be provided when the test has sections`,
        );
      } else {
        const score = provided.score;
        if (score == null || typeof score !== 'number') {
          errors.push(`${testName} ${label}: score is required`);
        } else if (score <= 0) {
          errors.push(
            `${testName} ${label}: score must be greater than 0 (received ${score})`,
          );
        } else if (score > sectionMax) {
          errors.push(
            `${testName} ${label}: score ${score} exceeds maximum ${sectionMax}`,
          );
        }
      }
    }

    const invalidSectionIds = providedSections
      .map((s) => s.id)
      .filter((id) => !requiredSectionIds.has(id));
    if (invalidSectionIds.length > 0) {
      errors.push(
        `${testName}: invalid section ID(s) — use ids from GET academic-form`,
      );
    }

    const duplicateIds = providedSections
      .map((s) => s.id)
      .filter((id, i, arr) => arr.indexOf(id) !== i);
    if (duplicateIds.length > 0) {
      errors.push(`${testName}: duplicate section scores are not allowed`);
    }
  }

  private sectionLabel(section: {
    id: string;
    sectionName?: string;
  }): string {
    const name = section.sectionName?.trim();
    return name || 'section';
  }

  // -------------------------------------------------------------------------
  // Preferred countries / programmes (shared logic)
  // -------------------------------------------------------------------------

  private async validatePreferredIds(
    label: string,
    ids: string[] | undefined,
    fetchExisting: () => Promise<Array<{ id: string }>>,
    errors: string[],
  ): Promise<void> {
    if (!ids?.length) return;

    const uniqueIds = [...new Set(ids)];

    if (ids.length !== uniqueIds.length) {
      errors.push(`Duplicate ${label} selections are not allowed`);
    }

    const existing = await fetchExisting();
    const existingIds = new Set(existing.map((e) => e.id));
    const invalidIds = uniqueIds.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      errors.push(`Invalid ${label} IDs: ${invalidIds.join(', ')}`);
    }
  }
}
