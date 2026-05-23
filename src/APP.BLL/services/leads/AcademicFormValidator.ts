import { Injectable, BadRequestException } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { AcademicFormRequestDto } from '@shared/dtos/leads/AcademicFormRequestDto';
import type { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { In } from 'typeorm';

/** Only degrees with these level orders are accepted for academic results. */
const VALID_LEVEL_ORDERS = new Set([1, 2, 3, 4]);



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
  async validateAcademicForm(
    dto: AcademicFormRequestDto,
    leadId: string,
  ): Promise<void> {
    const errors: string[] = [];

    
    await this.validateAcademicResults(dto, errors);
    await this.validateLastAcademicInstitute(dto, leadId, errors);
    await this.validateEnglishTestResults(dto, errors);
    await this.validatePreferredIds(
      'country',
      dto.preferredCountryIds,
      () =>
        this.db.countries.find({
          where: {
            id: In(dto.preferredCountryIds!),
          },
        }),
      errors,
    );
    
    await this.validatePreferredIds(
      'programme',
      dto.preferredProgrammeIds,
      () =>
        this.db.programmes.find({
          where: {
            id: In(dto.preferredProgrammeIds!),
          },
        }),
      errors,
    );
    
    if (errors.length) {
      throw new BadRequestException(errors);
    }
  }

  /**
   * When lastAcademicInstitute is sent, there must be a degree row in the DB
   * to receive the institute (highest levelOrder row), or academicResults in the same request.
   */
  private async validateLastAcademicInstitute(
    dto: AcademicFormRequestDto,
    leadId: string,
    errors: string[],
  ) {
    if (!dto.lastAcademicInstitute?.trim()) return;
  
    const hasAcademicInDb = await this.db.leadAcademicResults.findOne({
      where: { leadId },
    });
  
    if (!hasAcademicInDb) {
      errors.push(
        'At least one academic degree must exist before setting lastAcademicInstitute',
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


     // 1. duplicates
     const uniqueDegreeIds = this.validateDuplicateIds(
      'academic degree',
      degreeIds,
      errors,
     );


      // 2. invalid IDs
     await this.validateExistingIds(
     'academic degree',
     uniqueDegreeIds,
     () =>
      this.db.academicDegrees.find({
        where: uniqueDegreeIds.map(id => ({ id })),
      }),
     errors,
    );

    
     // 3. fetch valid degrees once
      const degrees = await this.db.academicDegrees.find({
        where: uniqueDegreeIds.map(id => ({ id })),
      });

    
    const degreeMap = new Map(degrees.map((d) => [d.id, d]));

   
   

    // Validate GPA per degree

    for (const r of dto.academicResults) {
      const degree = degreeMap.get(r.degreeId);
      if (!degree) continue;
  
      const gpa = r.gpa;
  
      // GPA must be valid number > 0
      if (typeof gpa !== 'number' || gpa <= 0) {
        errors.push(`Invalid GPA for ${degree.degreeName}`);
        continue;
      }
  
      const max = Number(degree.gpaScale);
  
      // GPA must not exceed scale
      if (!isNaN(max) && gpa > max) {
        errors.push(`GPA exceeds max scale ${degree.gpaScale} for ${degree.degreeName}`);
      }
    }
  }

  /**
   * English test results: no duplicates; each testId must exist;
   * overallScore required, > 0, within test maxScore when configured;
   * when test has sections in DB, all section ids must be present with score > 0 and within section maxScore when configured.
   */
  private async validateEnglishTestResults(
    dto: AcademicFormRequestDto,
    errors: string[],
  ): Promise<void> {
    if (!dto.englishTestResults?.length) return;

     const testIds = dto.englishTestResults.map((r) => r.testId);


    // 1. duplicates
    const uniqueTestIds = this.validateDuplicateIds(
      'English test',
      testIds,
      errors,
    );
    
    // 2. invalid IDs
    await this.validateExistingIds(
      'English test',
      uniqueTestIds,
      () =>
        this.db.englishTests.find({
          where: uniqueTestIds.map(id => ({ id })),
        }),
      errors,
    );
    // ---------------------------------------------------
    // Fetch tests with sections
    // ---------------------------------------------------
    const tests = await this.db.englishTests.find({
      where: uniqueTestIds.map(id => ({ id })),
      relations: { SysEnglishTestSection: true },
    });
    
    // { id: '1', testName: 'IELTS' }

    const testMap = new Map<string, SysEnglishTests>(
      tests.map((t) => [t.id, t]),
    );



    // const tests = await this.db.englishTests.find({
    //   where: uniqueTestIds.map((id) => ({ id })),
    //   relations: { SysEnglishTestSection: true },
    // });
    // const testMap = new Map(tests.map((t) => [t.id, t]));

    // const invalidTestIds = uniqueTestIds.filter((id) => !testMap.has(id));
    // if (invalidTestIds.length > 0) {
    //   errors.push(`Invalid English test IDs: ${invalidTestIds.join(', ')}`);
    // }

    // ---------------------------------------------------
    // Validate test scores
    // ---------------------------------------------------

    for (const result of dto.englishTestResults) {
      const test = testMap.get(result.testId);
      if (!test) continue;

      const overall = result.overallScore;
      const overallMax = Number(test.maxScore);

      // overall score must be a valid number > 0
      if (typeof overall !== 'number' || overall <= 0) {
        errors.push(
          `Invalid overall score for ${test.testName}`,
        );

        continue;
      }

      // overall score must not exceed maxScore
      if (!isNaN(overallMax) && overall > overallMax) {
        errors.push(
          `Overall score exceeds max score for ${test.testName}`,
        );

        continue;
      }
      
      // ---------------------------------------------------
      // Section validation
      // ---------------------------------------------------
      const sections = test.SysEnglishTestSection ?? [];

     // test has no sections
      if (!sections.length) continue;

      const providedSections = result.sections ?? [];

      // all sections are required
      const hasMissingSection = sections.some(
        (section) =>
          !providedSections.find((s) => s.id === section.id),
      );

      if (hasMissingSection) {
        errors.push(
          `All section scores are required for ${test.testName}`,
        );

        continue;
      }
      
      // validate section scores
      for (const section of sections) {
        const input = providedSections.find(
          (s) => s.id === section.id,
        );

        const score = input?.score;
        const max = Number(section.maxScore);

        // section score must be a valid number > 0
        if (typeof score !== 'number' || score <= 0) {
          errors.push(
            `Invalid ${section.sectionName} score for ${test.testName}`,
          );

          continue;
        }

        // section score must not exceed maxScore
        if (!isNaN(max) && score > max) {
          errors.push(
            `${section.sectionName} score exceeds max score for ${test.testName}`,
          );
        }
      }
    }
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
  private validateDuplicateIds(
    label: string,
    ids: string[],
    errors: string[],
  ): string[] {
    if (!ids?.length) return [];
  
    const uniqueIds = [...new Set(ids)];
  
    if (ids.length !== uniqueIds.length) {
      errors.push(`Duplicate ${label} entries are not allowed`);
    }
  
    return uniqueIds;
  }
  
  private async validateExistingIds<T extends { id: string }>(
    label: string,
    ids: string[],
    fetch: () => Promise<T[]>,
    errors: string[],
  ): Promise<void> {
    if (!ids?.length) return;
  
    const existing = await fetch();
    const existingSet = new Set(existing.map((e) => e.id));
  
    const invalidIds = ids.filter((id) => !existingSet.has(id));
  
    if (invalidIds.length > 0) {
      errors.push(`Invalid ${label} IDs: ${invalidIds.join(', ')}`);
    }
  }
}
