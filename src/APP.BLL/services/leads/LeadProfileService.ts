import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager, In, Repository } from 'typeorm';
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
import { SysAcademicDegrees } from '@entity/entities/SysAcademicDegrees.entity';
import { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { SearchCacheKeyBuilder } from '../search/shared/cache/SearchCacheKeyBuilder';

const LEVEL_ORDER_1_4 = new Set([1, 2, 3, 4]);

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
   * GET Academic Form - Returns all form data with validation rules.
   * Loads system degrees (levelOrder 1-4), English tests, countries, programmes for full-list response.
   */
  async getAcademicForm(userId: string): Promise<AcademicFormResponseDto> {
    this.logger.info('Getting academic form', {
      context: 'LeadProfileService.getAcademicForm',
      userId,
    });

    const [leadProfile, systemDegrees, systemEnglishTests, systemCountries, systemProgrammes] =
      await Promise.all([
        this.db.leadProfiles.findOne({
          where: { userId },
          relations: {
            LeadAcademicResult: { SysAcademicDegree: true },
            LeadEnglishTestResult: {
              SysEnglishTest: { SysEnglishTestSection: true },
              LeadEnglishTestSectionResult: { SysEnglishTestSection: true },
            },
            LeadPreferredCountry: true,
            LeadPreferredProgram: true,
          },
        }),
        this.db.academicDegrees.find({
          where: { levelOrder: In([1, 2, 3, 4]) },
          order: { levelOrder: 'ASC' },
        }),
        this.db.englishTests.find({
          relations: { SysEnglishTestSection: true },
        }),
        this.db.countries.find(),
        this.db.programmes.find(),
      ]);

    const academicFormStatus = await this.determinedAcademicFormStatus(userId);

    return this.mapper.toAcademicFormResponse(
      leadProfile,
      academicFormStatus,
      systemDegrees,
      systemEnglishTests,
      systemCountries,
      systemProgrammes,
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
   * Save academic form data within a transaction.
   * Option A: academic + lastAcademicInstitute + preferredCountryIds + preferredProgrammeIds are required (validated before).
   * Academic: only valid gpa (levelOrder 1-4); highest levelOrder gets lastAcademicInstitute; others institute null; invalid payload leaves existing as-is.
   * English: persist only when overall + all section scores valid.
   * Preferred: replace entire selection (max 3).
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

    // Academic: filter to valid gpa (levelOrder 1-4), apply lastAcademicInstitute to highest
    const degreeIds = dto.academicResults?.map((r) => r.degreeId) ?? [];
    const degrees =
      degreeIds.length > 0
        ? await manager.getRepository(SysAcademicDegrees).find({
            where: degreeIds.map((id) => ({ id })),
          })
        : [];
    const degreeMap = new Map(degrees.map((d) => [d.id, d]));
    const validAcademic = (dto.academicResults ?? []).filter((r) => {
      const degree = degreeMap.get(r.degreeId);
      if (!degree || !LEVEL_ORDER_1_4.has(degree.levelOrder)) return false;
      const scale = degree.gpaScale ? parseFloat(degree.gpaScale) : 5;
      const gpa = r.gpa;
      return gpa != null && gpa > 0 && gpa <= scale;
    });
    const maxLevelOrder = validAcademic.length
      ? Math.max(
          ...validAcademic.map(
            (r) => degreeMap.get(r.degreeId)!.levelOrder,
          ),
        )
      : 0;
    await this.upsertAcademicResults(
      academicResultsRepo,
      leadId,
      validAcademic.map((r) => ({
        ...r,
        institute:
          degreeMap.get(r.degreeId)!.levelOrder === maxLevelOrder
            ? (dto.lastAcademicInstitute?.trim() ?? '')
            : '',
      })),
    );

    // English: filter to only results with valid overall + all section scores valid
    const englishTestIds = dto.englishTestResults?.map((r) => r.testId) ?? [];
    const englishTests =
      englishTestIds.length > 0
        ? await manager.getRepository(SysEnglishTests).find({
            where: englishTestIds.map((id) => ({ id })),
            relations: { SysEnglishTestSection: true },
          })
        : [];
    const testMap = new Map(englishTests.map((t) => [t.id, t]));
    const validEnglish = (dto.englishTestResults ?? []).filter((result) => {
      const test = testMap.get(result.testId);
      if (!test) return false;
      const maxScore = test.maxScore ? parseFloat(test.maxScore) : 9;
      const overall =
        result.overallScore != null &&
        result.overallScore > 0 &&
        result.overallScore <= maxScore;
      const sections = test.SysEnglishTestSection ?? [];
      if (sections.length === 0) return overall;
      const sectionIds = new Set(sections.map((s) => s.id));
      const sectionScores = result.sections ?? [];
      const allValid = sectionIds.size > 0 && sectionScores.every((s) => {
        const sec = sections.find((x) => x.id === s.id);
        const max = sec?.maxScore ? parseFloat(sec.maxScore) : 9;
        return s.score > 0 && s.score <= max;
      });
      const allSectionsFilled =
        sectionScores.length >= sectionIds.size &&
        [...sectionIds].every((id) =>
          sectionScores.some((s) => s.id === id && s.score > 0),
        );
      return overall && allValid && allSectionsFilled;
    });
    await this.upsertEnglishTestResults(
      englishTestResultsRepo,
      sectionResultsRepo,
      leadId,
      validEnglish,
    );

    // Preferred: replace (Option A: already validated non-empty, max 3)
    const countryIds = (dto.preferredCountryIds ?? []).slice(0, 3);
    await preferredCountriesRepo.delete({ leadId });
    if (countryIds.length > 0) {
      await preferredCountriesRepo.save(
        countryIds.map((countryId) =>
          preferredCountriesRepo.create({ leadId, countryId }),
        ),
      );
    }
    const programmeIds = (dto.preferredProgrammeIds ?? []).slice(0, 3);
    await preferredProgramsRepo.delete({ leadId });
    if (programmeIds.length > 0) {
      await preferredProgramsRepo.save(
        programmeIds.map((programmeId) =>
          preferredProgramsRepo.create({ leadId, programmeId }),
        ),
      );
    }
  }

  /**
   * Upsert academic results (keyed by degreeId).
   * Only the provided results are written; existing rows for other degrees are left as-is.
   */
  private async upsertAcademicResults(
    repo: Repository<LeadAcademicResults>,
    leadId: string,
    results: Array<{
      degreeId: string;
      gpa?: number;
      institute?: string;
      passingDate?: string;
    }>,
  ): Promise<void> {
    if (!results || results.length === 0) return;

    const existingResults = await repo.find({ where: { leadId } });
    const existingByDegreeId = new Map(
      existingResults.map((r) => [r.degreeId, r]),
    );

    for (const result of results) {
      const existing = existingByDegreeId.get(result.degreeId);
      const gpaStr =
        result.gpa != null ? String(result.gpa) : undefined;
      const instituteVal = result.institute ?? '';
      const passingDateVal = result.passingDate
        ? new Date(result.passingDate)
        : undefined;
      if (existing) {
        await repo.update(existing.id, {
          gpa: gpaStr,
          institute: instituteVal,
          passingDate: passingDateVal,
        });
      } else {
        await repo.save(
          repo.create({
            leadId,
            degreeId: result.degreeId,
            gpa: gpaStr,
            institute: instituteVal,
            passingDate: passingDateVal,
          }),
        );
      }
    }
  }

  /**
   * Upsert English test results (keyed by testId).
   * Caller must pass only results that pass validation (valid overall + all section scores valid).
   */
  private async upsertEnglishTestResults(
    testRepo: Repository<LeadEnglishTestResults>,
    sectionRepo: Repository<LeadEnglishTestSectionResults>,
    leadId: string,
    results: AcademicFormRequestDto['englishTestResults'],
  ): Promise<void> {
    if (!results || results.length === 0) return;

    const existingResults = await testRepo.find({ where: { leadId } });
    const existingByTestId = new Map(
      existingResults.map((r) => [r.sysEngTestId, r]),
    );

    for (const result of results) {
      const overall =
        result.overallScore != null && result.overallScore > 0
          ? String(result.overallScore)
          : undefined;
      if (overall == null) continue;

      const existing = existingByTestId.get(result.testId);
      const testDateVal = result.testDate
        ? new Date(result.testDate)
        : undefined;

      if (existing) {
        await testRepo.update(existing.id, {
          overallScore: overall,
          testDate: testDateVal,
        });
        await this.upsertEnglishTestSections(
          sectionRepo,
          existing.id,
          result.sections ?? [],
        );
      } else {
        const savedTest = await testRepo.save(
          testRepo.create({
            leadId,
            sysEngTestId: result.testId,
            overallScore: overall,
            testDate: testDateVal,
          }),
        );
        const sections = result.sections ?? [];
        if (sections.length > 0) {
          await sectionRepo.save(
            sections.map((s) =>
              sectionRepo.create({
                resultId: savedTest.id,
                sysEngTestSectionId: s.id,
                sectionScore: String(s.score),
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
   * Academic form status for auth/search (2-field rule: academic + English only).
   * English: if test has sections, all sections must be filled for that test to count as complete;
   * if test has no sections, overall score filled is enough.
   */
  async determinedAcademicFormStatus(userId: string): Promise<AcademicFormStatus> {
    const profile = await this.db.leadProfiles.findOne({
      where: { userId },
      relations: {
        LeadAcademicResult: true,
        LeadEnglishTestResult: {
          SysEnglishTest: { SysEnglishTestSection: true },
          LeadEnglishTestSectionResult: true,
        },
      },
    });

    if (!profile) {
      return AcademicFormStatus.INCOMPLETE;
    }

    const hasAcademic = (profile.LeadAcademicResult?.length ?? 0) > 0;
    const hasEnglishTest = this.isAnyEnglishTestFullyComplete(
      profile.LeadEnglishTestResult ?? [],
    );
    const fields = [hasAcademic, hasEnglishTest];
    const filledCount = fields.filter(Boolean).length;

    if (filledCount === 0) return AcademicFormStatus.INCOMPLETE;
    if (filledCount === fields.length) return AcademicFormStatus.COMPLETED;
    return AcademicFormStatus.PARTIALLY_COMPLETED;
  }

  /**
   * True if at least one English test result is "fully complete":
   * - Test has no sections: overall score (or test date) filled is enough.
   * - Test has sections: user must have filled all section scores for that test.
   */
  private isAnyEnglishTestFullyComplete(
    results: Array<{
      overallScore?: string | null;
      SysEnglishTest?: {
        SysEnglishTestSection?: Array<{ id: string }>;
      } | null;
      LeadEnglishTestSectionResult?: Array<{
        sysEngTestSectionId: string;
        sectionScore?: string | null;
      }>;
    }>,
  ): boolean {
    return results.some((r) => this.isOneEnglishTestFullyComplete(r));
  }

  private isOneEnglishTestFullyComplete(
    result: {
      overallScore?: string | null;
      SysEnglishTest?: {
        SysEnglishTestSection?: Array<{ id: string }>;
      } | null;
      LeadEnglishTestSectionResult?: Array<{
        sysEngTestSectionId: string;
        sectionScore?: string | null;
      }>;
    },
  ): boolean {
    const sections = result.SysEnglishTest?.SysEnglishTestSection ?? [];
    const sectionResults = result.LeadEnglishTestSectionResult ?? [];

    if (sections.length === 0) {
      return (
        (result.overallScore != null && String(result.overallScore).trim() !== '') ||
        false
      );
    }

    const requiredSectionIds = new Set(sections.map((s) => s.id));
    const filledSectionIds = new Set(
      sectionResults
        .filter(
          (sr) =>
            sr.sectionScore != null && String(sr.sectionScore).trim() !== '',
        )
        .map((sr) => sr.sysEngTestSectionId),
    );
    return (
      requiredSectionIds.size > 0 &&
      [...requiredSectionIds].every((id) => filledSectionIds.has(id))
    );
  }

  /**
   * Determine full profile form status for a lead (4-field: academic, English, countries, programmes)
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
