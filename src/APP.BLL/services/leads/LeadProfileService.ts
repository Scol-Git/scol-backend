import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager, In, Not, Repository } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { AcademicFormValidator } from './AcademicFormValidator';
import { AcademicFormMapper } from './AcademicFormMapper';
import { AcademicFormRequestDto } from '@shared/dtos/leads/AcademicFormRequestDto';
import { AcademicFormResponseDto } from '@shared/dtos/leads/AcademicFormResponseDto';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';
import { LeadAcademicResults } from '@entity/entities/LeadAcademicResults.entity';
import { LeadDocuments } from '@entity/entities/LeadDocuments.entity';
import { LeadDocumentVersions } from '@entity/entities/LeadDocumentVersions.entity';
import { LeadEnglishTestResults } from '@entity/entities/LeadEnglishTestResults.entity';
import { LeadEnglishTestSectionResults } from '@entity/entities/LeadEnglishTestSectionResults.entity';
import { LeadPreferredCountries } from '@entity/entities/LeadPreferredCountries.entity';
import { LeadPreferredPrograms } from '@entity/entities/LeadPreferredPrograms.entity';
import { SysAcademicDegrees } from '@entity/entities/SysAcademicDegrees.entity';
import { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { SearchCacheInvalidationService } from '../search/shared/cache/SearchCacheInvalidationService';
import { LeadProfileMapper } from './LeadProfileMapper';
import { LeadProfileResponseDto } from '@shared/dtos/leads/LeadProfileResponseDto';
import { GenerateApplicationDocumentDownloadResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentDownloadResponseDto';
import { UploadStatus } from '@shared/enums/UploadStatus.enum';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';
import { ValidationException } from '@shared/exceptions/ValidationException';
import type { IStorageService } from '@shared/interfaces/IStorageService.interface';
import { IStorageService as IStorageServiceToken } from '@shared/tokens/injection.tokens';


const LEVEL_ORDER_1_4 = new Set([1, 2, 3, 4]);
const DEFAULT_GPA_SCALE = 5;

/** Relations required to load lead profile for academic form (GET) and for computing form status. */
const ACADEMIC_FORM_LEAD_PROFILE_RELATIONS = {
  LeadAcademicResult: { SysAcademicDegree: true },
  LeadEnglishTestResult: {
    SysEnglishTest: { SysEnglishTestSection: true },
    LeadEnglishTestSectionResult: { SysEnglishTestSection: true },
  },
  LeadPreferredCountry: true,
  LeadPreferredProgram: true,
} as const;

/**
 * Service for managing lead academic profile
 */
@Injectable()
export class LeadProfileService {
  private readonly downloadUrlExpiresSeconds: number;

  constructor(
    private readonly db: AppDbContext,
    private readonly validator: AcademicFormValidator,
    private readonly mapper: AcademicFormMapper,
    private readonly searchCacheInvalidation: SearchCacheInvalidationService,
    @Inject(ILoggerToken) private readonly logger: ILogger,
    @Inject(IStorageServiceToken)
    private readonly storage: IStorageService,
    private readonly config: ConfigService,
  ) {
    this.downloadUrlExpiresSeconds =
      this.config.get<number>('STORAGE_DOWNLOAD_URL_EXPIRES_SECONDS') ?? 3600;
  }

  /**
   * GET Academic Form - Returns all form data with validation rules.
   * Loads system degrees (levelOrder 1-4), English tests, countries, programmes for full-list response.
   * leadProfile may be null when the user has no profile yet.
   */

  async getLeadProfile(userId: string): Promise<LeadProfileResponseDto> {
    const profile = await this.db.leadProfiles.findOne({
      where: { userId },
      relations: {
        SysUser: true,
        LeadAcademicResult: { SysAcademicDegree: true },
        LeadEnglishTestResult: {
          SysEnglishTest: true,
        },
        LeadDocuments: {
          SysDocumentType: true,
        },
      },
    });

    //TODO use ValidationException
    if (!profile) {
      throw new ValidationException('Lead profile not found');
    }

    return LeadProfileMapper.toResponse(profile);
  }
  async getAcademicForm(userId: string): Promise<AcademicFormResponseDto> {
    this.logger.LogInfo('Getting academic form', {
      context: 'LeadProfileService.getAcademicForm',
      userId,
    });

    const [
      leadProfile,
      systemDegrees,
      systemEnglishTests,
      systemCountries,
      systemProgrammes,
    ] = await Promise.all([
      this.db.leadProfiles.findOne({
        where: { userId },
        relations: ACADEMIC_FORM_LEAD_PROFILE_RELATIONS,
      }),
      this.db.academicDegrees.find({
        where: { levelOrder: In([...LEVEL_ORDER_1_4]) },
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
    this.logger.LogInfo('Updating academic form', {
      context: 'LeadProfileService.updateAcademicForm',
      userId,
    });

    const leadProfile = await this.db.leadProfiles.findOne({
      where: { userId },
    });

    if (!leadProfile) {
      throw new NotFoundException('Lead profile not found');
    }

    await this.validator.validateAcademicForm(dto, leadProfile.id);

    // Execute in transaction
    await this.db.transaction(async (manager: EntityManager) => {
      await this.saveAcademicFormInTransaction(manager, leadProfile.id, dto);
    });

    await this.searchCacheInvalidation.invalidateAfterAcademicFormChanged(
      userId,
    );

    this.logger.LogInfo('Academic form updated successfully', {
      context: 'LeadProfileService.updateAcademicForm',
      userId,
      leadId: leadProfile.id,
      cacheInvalidated: true,
    });

    // Return the updated form data (same response as GET)
    return this.getAcademicForm(userId);
  }

  /**
   * Saves academic form data within a transaction.
   * All fields are optional: only provided sections are updated (update/add only; no delete for academic/English).
   * - Academic: send academicResults to upsert GPA; send lastAcademicInstitute to update institute on highest levelOrder row in DB.
   * - English: overall + all section scores (when test has sections) already validated.
   * - Preferred: updated only when the corresponding array is present in DTO; omit to leave existing selection unchanged.
   */
  private async saveAcademicFormInTransaction(
    manager: EntityManager,
    leadId: string,
    dto: AcademicFormRequestDto,
  ): Promise<void> {
    const academicResultsRepo = manager.getRepository(LeadAcademicResults);
    const englishTestResultsRepo = manager.getRepository(
      LeadEnglishTestResults,
    );
    const sectionResultsRepo = manager.getRepository(
      LeadEnglishTestSectionResults,
    );
    const preferredCountriesRepo = manager.getRepository(
      LeadPreferredCountries,
    );
    const preferredProgramsRepo = manager.getRepository(LeadPreferredPrograms);

    await this.saveAcademicResultsIfPresent(
      manager,
      academicResultsRepo,
      leadId,
      dto,
    );
    await this.saveEnglishTestResultsIfPresent(
      manager,
      englishTestResultsRepo,
      sectionResultsRepo,
      leadId,
      dto,
    );
    await this.savePreferredCountriesIfPresent(
      preferredCountriesRepo,
      leadId,
      dto.preferredCountryIds,
    );
    await this.savePreferredProgrammesIfPresent(
      preferredProgramsRepo,
      leadId,
      dto.preferredProgrammeIds,
    );
  }

  /**
   * Updates academic section when academicResults and/or lastAcademicInstitute are sent.
   * GPA upsert runs when academicResults is present; institute applies to highest levelOrder DB row when lastAcademicInstitute is sent.
   */
  private async saveAcademicResultsIfPresent(
    manager: EntityManager,
    repo: Repository<LeadAcademicResults>,
    leadId: string,
    dto: AcademicFormRequestDto,
  ): Promise<void> {
    const hasAcademicResults =
      Array.isArray(dto.academicResults) && dto.academicResults.length > 0;
    const hasLastInstitute =
      dto.lastAcademicInstitute != null &&
      String(dto.lastAcademicInstitute).trim() !== '';

    if (!hasAcademicResults && !hasLastInstitute) return;

    if (hasAcademicResults) {
      const degreeIds = dto.academicResults!.map((r) => r.degreeId);
      const degrees = await manager.getRepository(SysAcademicDegrees).find({
        where: degreeIds.map((id) => ({ id })),
      });
      const degreeMap = new Map(degrees.map((d) => [d.id, d]));

      const validAcademic = dto.academicResults!.filter((r) => {
        const degree = degreeMap.get(r.degreeId);
        if (!degree || !LEVEL_ORDER_1_4.has(degree.levelOrder)) return false;
        const scale = degree.gpaScale
          ? parseFloat(degree.gpaScale)
          : DEFAULT_GPA_SCALE;
        const gpa = r.gpa;
        return gpa != null && gpa > 0 && gpa <= scale;
      });

      if (validAcademic.length > 0) {
        await this.upsertAcademicResults(
          repo,
          leadId,
          validAcademic.map((r) => ({
            degreeId: r.degreeId,
            gpa: r.gpa,
            passingDate: r.passingDate,
          })),
        );
      }
    }

    if (hasLastInstitute) {
      await this.applyLastAcademicInstitute(
        repo,
        leadId,
        String(dto.lastAcademicInstitute).trim(),
      );
    }
  }

  /**
   * Sets institute on the lead row whose degree has the highest levelOrder (1–4) in the DB.
   * Used for lastAcademicInstitute whether sent alone or with academicResults (after GPA upsert when both).
   */
  private async applyLastAcademicInstitute(
    repo: Repository<LeadAcademicResults>,
    leadId: string,
    institute: string,
  ): Promise<void> {
    const rows = await repo.find({
      where: { leadId },
      relations: { SysAcademicDegree: true },
    });
    const target = this.findHighestLevelOrderDegree(rows);
    if (!target) {
      throw new BadRequestException(
        'At least one academic degree result must be filled before setting lastAcademicInstitute',
      );
    }
    await repo.update(target.id, { institute: institute.trim() });
  }

  private findHighestLevelOrderDegree(
    rows: LeadAcademicResults[],
  ): LeadAcademicResults | null {
    let best: LeadAcademicResults | null = null;
    let bestOrder = -1;

    for (const row of rows) {
      const degree = row.SysAcademicDegree;
      const order =
        degree?.levelOrder != null ? Number(degree.levelOrder) : null;
      if (order == null || !LEVEL_ORDER_1_4.has(order)) continue;

      if (order > bestOrder) {
        bestOrder = order;
        best = row;
      }
    }

    return best;
  }

  /**
   * Upserts English test results when dto.englishTestResults is provided.
   * Input is already validated (overall + all sections when test has sections).
   */
  private async saveEnglishTestResultsIfPresent(
    manager: EntityManager,
    testRepo: Repository<LeadEnglishTestResults>,
    sectionRepo: Repository<LeadEnglishTestSectionResults>,
    leadId: string,
    dto: AcademicFormRequestDto,
  ): Promise<void> {
    if (!dto.englishTestResults?.length) return;

    const testIds = dto.englishTestResults.map((r) => r.testId);
    const tests = await manager.getRepository(SysEnglishTests).find({
      where: testIds.map((id) => ({ id })),
      relations: { SysEnglishTestSection: true },
    });
    const testMap = new Map(tests.map((t) => [t.id, t]));

    const defaultMaxScore = 9;
    const validEnglish = dto.englishTestResults.filter((result) => {
      const test = testMap.get(result.testId);
      if (!test) return false;
      const testMaxScore = test.maxScore
        ? parseFloat(test.maxScore)
        : defaultMaxScore;
      const overallValid =
        result.overallScore != null &&
        result.overallScore > 0 &&
        result.overallScore <= testMaxScore;
      const sections =
        (
          test as SysEnglishTests & {
            SysEnglishTestSection?: Array<{ id: string; maxScore?: string }>;
          }
        ).SysEnglishTestSection ?? [];
      if (sections.length === 0) return overallValid;
      const sectionIds = new Set(sections.map((s) => s.id));
      const sectionScores = result.sections ?? [];
      const allSectionsValid = [...sectionIds].every((sectionId) => {
        const section = sections.find((s) => s.id === sectionId);
        const max = section?.maxScore
          ? parseFloat(section.maxScore)
          : defaultMaxScore;
        const provided = sectionScores.find((s) => s.id === sectionId);
        return provided != null && provided.score > 0 && provided.score <= max;
      });
      return overallValid && allSectionsValid;
    });
    if (validEnglish.length === 0) return;

    await this.upsertEnglishTestResults(
      testRepo,
      sectionRepo,
      leadId,
      validEnglish,
    );
  }

  /**
   * Replaces preferred countries when countryIds is defined (omit to leave unchanged).
   */
  private async savePreferredCountriesIfPresent(
    repo: Repository<LeadPreferredCountries>,
    leadId: string,
    countryIds: string[] | undefined,
  ): Promise<void> {
    if (countryIds === undefined) return;

    await repo.delete({ leadId });
    const ids = countryIds.slice(0, 3);
    if (ids.length > 0) {
      await repo.save(
        ids.map((countryId) => repo.create({ leadId, countryId })),
      );
    }
  }

  /**
   * Replaces preferred programmes when programmeIds is defined (omit to leave unchanged).
   */
  private async savePreferredProgrammesIfPresent(
    repo: Repository<LeadPreferredPrograms>,
    leadId: string,
    programmeIds: string[] | undefined,
  ): Promise<void> {
    if (programmeIds === undefined) return;

    await repo.delete({ leadId });
    const ids = programmeIds.slice(0, 3);
    if (ids.length > 0) {
      await repo.save(
        ids.map((programmeId) => repo.create({ leadId, programmeId })),
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
      const gpaStr = result.gpa != null ? String(result.gpa) : undefined;
      const passingDateVal = result.passingDate
        ? new Date(result.passingDate)
        : undefined;

      if (existing) {
        const update: {
          gpa?: string;
          institute?: string;
          passingDate?: Date;
        } = {};
        if (gpaStr !== undefined) {
          update.gpa = gpaStr;
        }
        if (passingDateVal !== undefined) {
          update.passingDate = passingDateVal;
        }
        if (result.institute !== undefined) {
          update.institute = result.institute;
        }
        if (Object.keys(update).length > 0) {
          await repo.update(existing.id, update);
        }
      } else {
        const entity = repo.create({
          leadId,
          degreeId: result.degreeId,
          gpa: gpaStr,
          passingDate: passingDateVal,
          institute: '',
        });
        if (result.institute !== undefined) {
          entity.institute = result.institute;
        }
        await repo.save(entity);
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
  async determinedAcademicFormStatus(
    userId: string,
  ): Promise<AcademicFormStatus> {
    const profile = await this.db.leadProfiles.findOne({
      where: { userId },
      relations: ACADEMIC_FORM_LEAD_PROFILE_RELATIONS,
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

  private isOneEnglishTestFullyComplete(result: {
    overallScore?: string | null;
    SysEnglishTest?: {
      SysEnglishTestSection?: Array<{ id: string }>;
    } | null;
    LeadEnglishTestSectionResult?: Array<{
      sysEngTestSectionId: string;
      sectionScore?: string | null;
    }>;
  }): boolean {
    const sections = result.SysEnglishTest?.SysEnglishTestSection ?? [];
    const sectionResults = result.LeadEnglishTestSectionResult ?? [];

    if (sections.length === 0) {
      return (
        (result.overallScore != null &&
          String(result.overallScore).trim() !== '') ||
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

  async generateLeadDocumentDownloadUrl(
    currentUserId: string,
    documentId: string,
  ): Promise<GenerateApplicationDocumentDownloadResponseDto> {
    const leadProfile = await this.db.leadProfiles.findOne({
      where: { userId: currentUserId },
    });

    if (!leadProfile) {
      throw new NotFoundException('Lead profile not found');
    }

    const document = await this.db.leadDocuments.findOne({
      where: {
        id: documentId,
        leadId: leadProfile.id,
        overallStatus: In([
          ApplicationDocumentStatus.InProgress,
          ApplicationDocumentStatus.Verified,
        ]),
      },
    });

    if (!document) {
      throw new NotFoundException('Lead document not found');
    }

    if (!document.currentLeadDocumentVersionId) {
      throw new ValidationException('No active document version available');
    }

    const version = await this.db.leadDocumentVersions.findOne({
      where: {
        id: document.currentLeadDocumentVersionId,
        leadDocumentId: document.id,
        uploadStatus: UploadStatus.UPLOADED,
      },
    });

    if (!version) {
      throw new NotFoundException('Uploaded lead document version not found');
    }

    if (!version.storageKey) {
      throw new ValidationException('Invalid storage key');
    }

    const url = await this.storage.generateDownloadUrl(version.storageKey);

    return {
      url,
      expiresInSeconds: this.downloadUrlExpiresSeconds ?? 3600,
      fileName: version.originalFileName,
    };
  }

  async deleteLeadDocument(
    currentUserId: string,
    documentId: string,
  ): Promise<{ success: true }> {
    const leadProfile = await this.db.leadProfiles.findOne({
      where: { userId: currentUserId },
    });
  
    if (!leadProfile) {
      throw new NotFoundException('Lead profile not found');
    }
  
    // 1. Resolve document
    const document = await this.db.leadDocuments.findOne({
      where: {
        id: documentId,
        leadId: leadProfile.id,
        overallStatus: Not(ApplicationDocumentStatus.Verified),
      },
    });
  
    if (!document?.currentLeadDocumentVersionId) {
      throw new NotFoundException('Document cannot be deleted');
    }
  
    // 2. Resolve version
    const version = await this.db.leadDocumentVersions.findOne({
      where: {
        id: document.currentLeadDocumentVersionId,
        leadDocumentId: document.id,
        uploadStatus: UploadStatus.UPLOADED,
      },
    });
  
    if (!version) {
      throw new NotFoundException('Document version not found');
    }
  
    await this.db.transaction(async (manager) => {
      this.logger.LogInfo('Deleting lead document', {
        context: 'LeadProfileService.deleteLeadDocument',
        actedByUserId: currentUserId,
        leadId: leadProfile.id,
        documentId: document.id,
        documentVersionId: version.id,
        documentScope: 'LEAD',
        fileName: version.originalFileName,
      });

      await manager.getRepository(LeadDocumentVersions).delete({
        leadDocumentId: document.id,
      });
      await manager.getRepository(LeadDocuments).delete(document.id);
    });

    return { success: true };
  }
}
