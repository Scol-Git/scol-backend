import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ILogger } from '@shared/interfaces/logging';
import type { ICacheService } from '@shared/interfaces/infrastructure';
import {
  ILogger as ILoggerToken,
  ICacheService as ICacheToken,
} from '@shared/tokens/injection.tokens';
import { AcademicFormValidator } from './AcademicFormValidator';
import { AcademicFormMapper } from './AcademicFormMapper';
import { AcademicFormRequestDto } from '@shared/dtos/leads/AcademicFormRequestDto';
import { AcademicFormResponseDto } from '@shared/dtos/leads/AcademicFormResponseDto';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';
import { LeadAcademicResults } from '@entity/entities/LeadAcademicResults.entity';
import { LeadEnglishTestResults } from '@entity/entities/LeadEnglishTestResults.entity';
import { LeadEnglishTestSectionResults } from '@entity/entities/LeadEnglishTestSectionResults.entity';
import { LeadPreferredCountries } from '@entity/entities/LeadPreferredCountries.entity';
import { LeadPreferredPrograms } from '@entity/entities/LeadPreferredPrograms.entity';
import { SearchCacheKeyBuilder } from '../search/shared/cache/SearchCacheKeyBuilder';

/**
 * Service for managing lead academic profile
 */
@Injectable()
export class LeadProfileService {
  constructor(
    private readonly db: AppDbContext,
    private readonly validator: AcademicFormValidator,
    private readonly mapper: AcademicFormMapper,
    @Inject(ILoggerToken) private readonly logger: ILogger,
    @Inject(ICacheToken) private readonly cache: ICacheService,
  ) {}

  /**
   * GET Academic Form - Returns all form data with validation rules
   */
  async getAcademicForm(userId: string): Promise<AcademicFormResponseDto> {
    this.logger.info('Getting academic form', {
      context: 'LeadProfileService.getAcademicForm',
      userId,
    });

    // Get lead profile with all related data
    const leadProfile = await this.db.leadProfiles.findOne({
      where: { userId },
      relations: {
        LeadAcademicResult: { SysAcademicDegree: true },
        LeadEnglishTestResult: {
          SysEnglishTest: true,
          LeadEnglishTestSectionResult: { SysEnglishTestSection: true },
        },
        LeadPreferredCountry: true,
        LeadPreferredProgram: true,
      },
    });

    // Get all master data for the form
    const [allDegrees, allEnglishTests, allCountries, allProgrammes] =
      await Promise.all([
        this.db.academicDegrees.find({ order: { levelOrder: 'ASC' } }),
        this.db.englishTests.find({
          relations: { SysEnglishTestSection: true },
        }),
        this.db.countries.find({ order: { countryName: 'ASC' } }),
        this.db.programmes.find({ order: { name: 'ASC' } }),
      ]);

    return this.mapper.toAcademicFormResponse(
      leadProfile,
      allDegrees,
      allEnglishTests,
      allCountries,
      allProgrammes,
    );
  }

  /**
   * PUT Academic Form - Single transactional write for the entire form
   * Returns the updated form data (same as GET response)
   */
  async updateAcademicForm(
    userId: string,
    dto: AcademicFormRequestDto,
  ): Promise<AcademicFormResponseDto> {
    this.logger.info('Updating academic form', {
      context: 'LeadProfileService.updateAcademicForm',
      userId,
    });

    // Validate input
    await this.validator.validateAcademicForm(dto);

    // Get lead profile
    const leadProfile = await this.db.leadProfiles.findOne({
      where: { userId },
    });

    if (!leadProfile) {
      throw new NotFoundException('Lead profile not found');
    }

    // Execute in transaction
    await this.db.transaction(async (manager: EntityManager) => {
      await this.saveAcademicFormInTransaction(manager, leadProfile.id, dto);
    });

    // Invalidate caches (profile data changed affects search results)
    const userContextKey = SearchCacheKeyBuilder.forUserContext(userId);
    const searchResultsPrefix = SearchCacheKeyBuilder.getSearchResultsPrefix();

    await Promise.all([
      this.cache.remove(userContextKey),
      this.cache.clearByPrefix(searchResultsPrefix),
    ]);

    this.logger.info('Academic form updated successfully', {
      context: 'LeadProfileService.updateAcademicForm',
      userId,
      leadId: leadProfile.id,
      cacheInvalidated: {
        userContext: userContextKey,
        searchResults: `${searchResultsPrefix}*`,
      },
    });

    // Return the updated form data (same response as GET)
    return this.getAcademicForm(userId);
  }

  /**
   * Save academic form data within a transaction (UPSERT strategy)
   *
   * Only processes fields that are provided in the request.
   * Fields not provided are left untouched.
   */
  private async saveAcademicFormInTransaction(
    manager: EntityManager,
    leadId: string,
    dto: AcademicFormRequestDto,
  ): Promise<void> {
    const academicResultsRepo = manager.getRepository(LeadAcademicResults);
    const englishTestResultsRepo = manager.getRepository(LeadEnglishTestResults);
    const sectionResultsRepo = manager.getRepository(LeadEnglishTestSectionResults);
    const preferredCountriesRepo = manager.getRepository(LeadPreferredCountries);
    const preferredProgramsRepo = manager.getRepository(LeadPreferredPrograms);

    // Upsert academic results (if provided)
    if (dto.academicResults !== undefined) {
      await this.upsertAcademicResults(
        academicResultsRepo,
        leadId,
        dto.academicResults ?? [],
      );
    }

    // Upsert English test results (if provided)
    if (dto.englishTestResults !== undefined) {
      await this.upsertEnglishTestResults(
        englishTestResultsRepo,
        sectionResultsRepo,
        leadId,
        dto.englishTestResults ?? [],
      );
    }

    // Upsert preferred countries (if provided)
    if (dto.preferredCountryIds !== undefined) {
      await this.upsertPreferredCountries(
        preferredCountriesRepo,
        leadId,
        dto.preferredCountryIds ?? [],
      );
    }

    // Upsert preferred programmes (if provided)
    if (dto.preferredProgrammeIds !== undefined) {
      await this.upsertPreferredProgrammes(
        preferredProgramsRepo,
        leadId,
        dto.preferredProgrammeIds ?? [],
      );
    }
  }

  /**
   * Upsert academic results (keyed by degreeId)
   * - Empty/undefined array = skip (no changes)
   * - Values provided = upsert (update existing by degreeId, insert new)
   */
  private async upsertAcademicResults(
    repo: Repository<LeadAcademicResults>,
    leadId: string,
    results: AcademicFormRequestDto['academicResults'],
  ): Promise<void> {
    if (!results || results.length === 0) {
      // Empty or undefined = skip, don't touch existing data
      return;
    }

    const existingResults = await repo.find({ where: { leadId } });
    const existingByDegreeId = new Map(
      existingResults.map((r) => [r.degreeId, r]),
    );

    // Upsert each result (update existing, insert new)
    for (const result of results) {
      const existing = existingByDegreeId.get(result.degreeId);
      if (existing) {
        // Update existing
        await repo.update(existing.id, {
          gpa: result.gpa?.toString(),
          institute: result.institute ?? '',
          passingDate: result.passingDate ? new Date(result.passingDate) : undefined,
        });
      } else {
        // Insert new
        await repo.save(
          repo.create({
            leadId,
            degreeId: result.degreeId,
            gpa: result.gpa?.toString(),
            institute: result.institute ?? '',
            passingDate: result.passingDate ? new Date(result.passingDate) : undefined,
          }),
        );
      }
    }
  }

  /**
   * Upsert English test results (keyed by testId)
   * - Empty/undefined array = skip (no changes)
   * - Values provided = upsert (update existing by testId, insert new)
   */
  private async upsertEnglishTestResults(
    testRepo: Repository<LeadEnglishTestResults>,
    sectionRepo: Repository<LeadEnglishTestSectionResults>,
    leadId: string,
    results: AcademicFormRequestDto['englishTestResults'],
  ): Promise<void> {
    if (!results || results.length === 0) {
      // Empty or undefined = skip, don't touch existing data
      return;
    }

    const existingResults = await testRepo.find({ where: { leadId } });
    const existingByTestId = new Map(
      existingResults.map((r) => [r.sysEngTestId, r]),
    );

    // Upsert each test result (update existing, insert new)
    for (const result of results) {
      const existing = existingByTestId.get(result.testId);

      if (existing) {
        // Update existing test
        await testRepo.update(existing.id, {
          overallScore: result.overallScore.toString(),
          testDate: result.testDate ? new Date(result.testDate) : undefined,
        });

        // Upsert sections
        await this.upsertEnglishTestSections(
          sectionRepo,
          existing.id,
          result.sections ?? [],
        );
      } else {
        // Insert new test
        const savedTest = await testRepo.save(
          testRepo.create({
            leadId,
            sysEngTestId: result.testId,
            overallScore: result.overallScore.toString(),
            testDate: result.testDate ? new Date(result.testDate) : undefined,
          }),
        );

        // Insert sections
        if (result.sections?.length) {
          await sectionRepo.save(
            result.sections.map((s) =>
              sectionRepo.create({
                resultId: savedTest.id,
                sysEngTestSectionId: s.id,
                sectionScore: s.score.toString(),
              }),
            ),
          );
        }
      }
    }
  }

  /**
   * Upsert English test sections (keyed by id)
   * - Empty array = skip (no changes to sections)
   * - Values provided = upsert (update existing by id, insert new)
   */
  private async upsertEnglishTestSections(
    repo: Repository<LeadEnglishTestSectionResults>,
    resultId: string,
    sections: { id: string; score: number }[],
  ): Promise<void> {
    if (!sections || sections.length === 0) {
      // Empty = skip, don't touch existing sections
      return;
    }

    const existingSections = await repo.find({ where: { resultId } });
    const existingBySectionId = new Map(
      existingSections.map((s) => [s.sysEngTestSectionId, s]),
    );

    // Upsert each section (update existing, insert new)
    for (const section of sections) {
      const existing = existingBySectionId.get(section.id);
      if (existing) {
        // Update existing
        await repo.update(existing.id, {
          sectionScore: section.score.toString(),
        });
      } else {
        // Insert new
        await repo.save(
          repo.create({
            resultId,
            sysEngTestSectionId: section.id,
            sectionScore: section.score.toString(),
          }),
        );
      }
    }
  }

  /**
   * Upsert preferred countries
   * - Empty/undefined array = skip (no changes)
   * - Values provided = add new countries (keeps existing, adds missing)
   */
  private async upsertPreferredCountries(
    repo: Repository<LeadPreferredCountries>,
    leadId: string,
    countryIds: string[],
  ): Promise<void> {
    if (!countryIds || countryIds.length === 0) {
      // Empty = skip, don't touch existing data
      return;
    }

    const existing = await repo.find({ where: { leadId } });
    const existingIds = new Set(existing.map((e) => e.countryId));

    // Insert only new ones (don't delete existing)
    const toInsert = countryIds.filter((id) => !existingIds.has(id));
    if (toInsert.length > 0) {
      await repo.save(
        toInsert.map((countryId) => repo.create({ leadId, countryId })),
      );
    }
  }

  /**
   * Upsert preferred programmes
   * - Empty/undefined array = skip (no changes)
   * - Values provided = add new programmes (keeps existing, adds missing)
   */
  private async upsertPreferredProgrammes(
    repo: Repository<LeadPreferredPrograms>,
    leadId: string,
    programmeIds: string[],
  ): Promise<void> {
    if (!programmeIds || programmeIds.length === 0) {
      // Empty = skip, don't touch existing data
      return;
    }

    const existing = await repo.find({ where: { leadId } });
    const existingIds = new Set(existing.map((e) => e.programmeId));

    // Insert only new ones (don't delete existing)
    const toInsert = programmeIds.filter((id) => !existingIds.has(id));
    if (toInsert.length > 0) {
      await repo.save(
        toInsert.map((programmeId) => repo.create({ leadId, programmeId })),
      );
    }
  }

  /**
   * Determine academic form status for a lead
   */
  async getFormStatus(userId: string): Promise<AcademicFormStatus> {
    const profile = await this.db.leadProfiles.findOne({
      where: { userId },
      relations: {
        LeadAcademicResult: true,
        LeadEnglishTestResult: true,
        LeadPreferredCountry: true,
        LeadPreferredProgram: true,
      },
    });

    if (!profile) {
      return AcademicFormStatus.INCOMPLETE;
    }

    const hasAcademic = (profile.LeadAcademicResult?.length ?? 0) > 0;
    const hasEnglishTest = (profile.LeadEnglishTestResult?.length ?? 0) > 0;
    const hasCountries = (profile.LeadPreferredCountry?.length ?? 0) > 0;
    const hasPrograms = (profile.LeadPreferredProgram?.length ?? 0) > 0;

    const fields = [hasAcademic, hasEnglishTest, hasCountries, hasPrograms];
    const filledCount = fields.filter(Boolean).length;

    if (filledCount === 0) return AcademicFormStatus.INCOMPLETE;
    if (filledCount === fields.length) return AcademicFormStatus.COMPLETED;
    return AcademicFormStatus.PARTIALLY_COMPLETED;
  }
}
