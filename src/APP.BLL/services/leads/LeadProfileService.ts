import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
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
        LeadEnglishTestResult: { SysEnglishTest: true, LeadEnglishTestSectionResult: { SysEnglishTestSection: true } },
        LeadPreferredCountry: true,
        LeadPreferredProgram: true,
      },
    });

    // Get all master data for the form
    const [allDegrees, allEnglishTests, allCountries, allProgrammes] =
      await Promise.all([
        this.db.academicDegrees.find({ order: { levelOrder: 'ASC' } }),
        this.db.englishTests.find({ relations: { SysEnglishTestSection: true } }),
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
   */
  async updateAcademicForm(
    userId: string,
    dto: AcademicFormRequestDto,
  ): Promise<void> {
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

    this.logger.info('Academic form updated successfully', {
      context: 'LeadProfileService.updateAcademicForm',
      userId,
      leadId: leadProfile.id,
    });
  }

  /**
   * Save academic form data within a transaction
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

    // Delete existing data (replace strategy)
    await Promise.all([
      academicResultsRepo.delete({ leadId }),
      englishTestResultsRepo.delete({ leadId }),
      preferredCountriesRepo.delete({ leadId }),
      preferredProgramsRepo.delete({ leadId }),
    ]);

    // Insert new academic results
    if (dto.academicResults?.length) {
      const academicEntities = dto.academicResults.map((r) =>
        academicResultsRepo.create({
          leadId,
          degreeId: r.degreeId,
          gpa: r.gpa?.toString(),
          institute: r.institute ?? '',
          passingDate: r.passingDate ? new Date(r.passingDate) : undefined,
        }),
      );
      await academicResultsRepo.save(academicEntities);
    }

    // Insert new English test results with sections
    if (dto.englishTestResults?.length) {
      for (const testResult of dto.englishTestResults) {
        const testEntity = englishTestResultsRepo.create({
          leadId,
          sysEngTestId: testResult.testId,
          overallScore: testResult.overallScore.toString(),
          testDate: testResult.testDate ? new Date(testResult.testDate) : undefined,
        });
        const savedTest = await englishTestResultsRepo.save(testEntity);

        // Save section results
        if (testResult.sections?.length) {
          const sectionEntities = testResult.sections.map((s) =>
            sectionResultsRepo.create({
              resultId: savedTest.id,
              sysEngTestSectionId: s.sectionId,
              sectionScore: s.score.toString(),
            }),
          );
          await sectionResultsRepo.save(sectionEntities);
        }
      }
    }

    // Insert preferred countries
    if (dto.preferredCountryIds?.length) {
      const countryEntities = dto.preferredCountryIds.map((countryId) =>
        preferredCountriesRepo.create({
          leadId,
          countryId,
        }),
      );
      await preferredCountriesRepo.save(countryEntities);
    }

    // Insert preferred programmes
    if (dto.preferredProgrammeIds?.length) {
      const programmeEntities = dto.preferredProgrammeIds.map((programmeId) =>
        preferredProgramsRepo.create({
          leadId,
          programmeId,
        }),
      );
      await preferredProgramsRepo.save(programmeEntities);
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
