import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { LeadAcademicResults } from '@entity/entities/LeadAcademicResults.entity';
import { LeadEnglishTestResults } from '@entity/entities/LeadEnglishTestResults.entity';
import { ApplicationQueryService } from '@bll/services/applications/ApplicationQueryService';
import { AcademicFormMapper } from '@bll/services/leads/AcademicFormMapper';
import { AcademicFormValidator } from '@bll/services/leads/AcademicFormValidator';
import { LeadAcademicResultWriter } from '@bll/services/leads/helpers/LeadAcademicResultWriter';
import { LeadProfileService } from '@bll/services/leads/LeadProfileService';
import { SearchCacheInvalidationService } from '@bll/services/search/shared/cache/SearchCacheInvalidationService';
import { ChangeCrmLeadAcademicResultVerificationResponseDto } from '@shared/dtos/crm/leads/ChangeCrmLeadAcademicResultVerificationResponseDto';
import { ChangeCrmLeadEnglishTestResultVerificationResponseDto } from '@shared/dtos/crm/leads/ChangeCrmLeadEnglishTestResultVerificationResponseDto';
import { ChangeCrmLeadResultVerificationRequestDto } from '@shared/dtos/crm/leads/ChangeCrmLeadResultVerificationRequestDto';
import { DeleteCrmLeadResultResponseDto } from '@shared/dtos/crm/leads/DeleteCrmLeadResultResponseDto';
import { GetCrmLeadProfileResponseDto } from '@shared/dtos/crm/leads/GetCrmLeadProfileResponseDto';
import { UpdateCrmLeadAcademicResultsRequestDto } from '@shared/dtos/crm/leads/UpdateCrmLeadAcademicResultsRequestDto';
import { UpdateCrmLeadAcademicResultsResponseDto } from '@shared/dtos/crm/leads/UpdateCrmLeadAcademicResultsResponseDto';
import { UpdateCrmLeadEnglishTestResultsRequestDto } from '@shared/dtos/crm/leads/UpdateCrmLeadEnglishTestResultsRequestDto';
import { UpdateCrmLeadEnglishTestResultsResponseDto } from '@shared/dtos/crm/leads/UpdateCrmLeadEnglishTestResultsResponseDto';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { CrmLeadAccessService } from './helpers/CrmLeadAccessService';
import { CrmLeadProfileMapper } from './helpers/CrmLeadProfileMapper';

const VALID_LEVEL_ORDERS = [1, 2, 3, 4];

const CRM_LEAD_PROFILE_RELATIONS = {
  SysUser: true,
  LeadCrmInfo: true,
  LeadAcademicResult: { SysAcademicDegree: true },
  LeadEnglishTestResult: {
    SysEnglishTest: { SysEnglishTestSection: true },
    LeadEnglishTestSectionResult: { SysEnglishTestSection: true },
  },
  LeadDocuments: { SysDocumentType: true },
} as const;

@Injectable()
export class CrmLeadProfileService {
  constructor(
    private readonly db: AppDbContext,
    private readonly accessService: CrmLeadAccessService,
    private readonly applicationQueryService: ApplicationQueryService,
    private readonly validator: AcademicFormValidator,
    private readonly academicFormMapper: AcademicFormMapper,
    private readonly academicResultWriter: LeadAcademicResultWriter,
    private readonly searchCacheInvalidation: SearchCacheInvalidationService,
  ) {}

  async getLeadProfile(
    currentUserId: string,
    leadId: string,
  ): Promise<GetCrmLeadProfileResponseDto> {
    await this.accessService.ensureCrmCanAccessLeadOrThrow(
      currentUserId,
      leadId,
    );

    const [profile, systemDegrees, systemEnglishTests, applications] =
      await Promise.all([
        this.loadLeadProfileGraphOrThrow(leadId),
        this.loadSystemDegrees(),
        this.loadSystemEnglishTests(),
        this.applicationQueryService.getApplicationsForAuthorizedLead(
          leadId,
          'CRM',
        ),
      ]);

    const applicationJourney = applications.applications ?? [];

    return {
      personalInformation: CrmLeadProfileMapper.toPersonalInformation(
        profile,
        CrmLeadProfileMapper.toTargetUniversities(applicationJourney),
      ),
      academicResults: this.academicFormMapper.toCrmAcademicResults(
        profile,
        systemDegrees,
      ),
      englishTestResults: this.academicFormMapper.toCrmEnglishTestResults(
        profile,
        systemEnglishTests,
      ),
      applicationSharedDocuments:
        CrmLeadProfileMapper.toSharedDocuments(profile),
      applicationJourney,
    };
  }

  async updateAcademicResults(
    currentUserId: string,
    leadId: string,
    dto: UpdateCrmLeadAcademicResultsRequestDto,
  ): Promise<UpdateCrmLeadAcademicResultsResponseDto> {
    const leadProfile = await this.accessService.ensureCrmCanAccessLeadOrThrow(
      currentUserId,
      leadId,
    );

    await this.validator.validateAcademicResultsOrThrow(dto.academicResults);

    await this.db.transaction(async (manager: EntityManager) => {
      await this.academicResultWriter.upsertAcademicResults(
        manager.getRepository(LeadAcademicResults),
        leadId,
        dto.academicResults,
      );
    });

    await this.searchCacheInvalidation.invalidateAfterAcademicFormChanged(
      leadProfile.userId,
    );

    return {
      academicResults: this.academicFormMapper.toCrmAcademicResults(
        await this.loadLeadProfileGraphOrThrow(leadId),
        await this.loadSystemDegrees(),
      ),
    };
  }

  async changeAcademicResultVerification(
    currentUserId: string,
    leadId: string,
    degreeId: string,
    dto: ChangeCrmLeadResultVerificationRequestDto,
  ): Promise<ChangeCrmLeadAcademicResultVerificationResponseDto> {
    await this.accessService.ensureCrmCanAccessLeadOrThrow(
      currentUserId,
      leadId,
    );

    const result = await this.db.leadAcademicResults.findOne({
      where: { leadId, degreeId },
      relations: { SysAcademicDegree: true },
    });

    if (!result) {
      throw new NotFoundException('Academic result not found');
    }

    const previousIsVerified = result.isVerified === true;
    if (previousIsVerified === dto.isVerified) {
      return {
        success: true,
        degreeId,
        previousIsVerified,
        isVerified: previousIsVerified,
      };
    }

    if (dto.isVerified) {
      this.ensureAcademicResultCompleteOrThrow(result);
    }

    result.isVerified = dto.isVerified;
    await this.db.leadAcademicResults.save(result);

    return {
      success: true,
      degreeId,
      previousIsVerified,
      isVerified: dto.isVerified,
    };
  }

  async deleteAcademicResult(
    currentUserId: string,
    leadId: string,
    degreeId: string,
  ): Promise<DeleteCrmLeadResultResponseDto> {
    const leadProfile = await this.accessService.ensureCrmCanAccessLeadOrThrow(
      currentUserId,
      leadId,
    );

    const deleted = await this.db.transaction(async (manager) =>
      this.academicResultWriter.deleteAcademicResult(manager, leadId, degreeId),
    );

    if (!deleted) {
      throw new NotFoundException('Academic result not found');
    }

    await this.searchCacheInvalidation.invalidateAfterAcademicFormChanged(
      leadProfile.userId,
    );

    return { success: true };
  }

  async updateEnglishTestResults(
    currentUserId: string,
    leadId: string,
    dto: UpdateCrmLeadEnglishTestResultsRequestDto,
  ): Promise<UpdateCrmLeadEnglishTestResultsResponseDto> {
    const leadProfile = await this.accessService.ensureCrmCanAccessLeadOrThrow(
      currentUserId,
      leadId,
    );

    await this.validator.validateEnglishTestResultsOrThrow(
      dto.englishTestResults,
    );

    await this.db.transaction(async (manager: EntityManager) => {
      await this.academicResultWriter.saveValidatedEnglishTestResults(
        manager,
        leadId,
        dto.englishTestResults,
      );
    });

    await this.searchCacheInvalidation.invalidateAfterAcademicFormChanged(
      leadProfile.userId,
    );

    return {
      englishTestResults: this.academicFormMapper.toCrmEnglishTestResults(
        await this.loadLeadProfileGraphOrThrow(leadId),
        await this.loadSystemEnglishTests(),
      ),
    };
  }

  async changeEnglishTestResultVerification(
    currentUserId: string,
    leadId: string,
    testId: string,
    dto: ChangeCrmLeadResultVerificationRequestDto,
  ): Promise<ChangeCrmLeadEnglishTestResultVerificationResponseDto> {
    await this.accessService.ensureCrmCanAccessLeadOrThrow(
      currentUserId,
      leadId,
    );

    const result = await this.db.leadEnglishTestResults.findOne({
      where: { leadId, sysEngTestId: testId },
      relations: {
        SysEnglishTest: { SysEnglishTestSection: true },
        LeadEnglishTestSectionResult: true,
      },
    });

    if (!result) {
      throw new NotFoundException('English test result not found');
    }

    const previousIsVerified = result.isVerified === true;
    if (previousIsVerified === dto.isVerified) {
      return {
        success: true,
        testId,
        previousIsVerified,
        isVerified: previousIsVerified,
      };
    }

    if (dto.isVerified) {
      this.ensureEnglishTestResultCompleteOrThrow(result);
    }

    result.isVerified = dto.isVerified;
    await this.db.leadEnglishTestResults.save(result);

    return {
      success: true,
      testId,
      previousIsVerified,
      isVerified: dto.isVerified,
    };
  }

  async deleteEnglishTestResult(
    currentUserId: string,
    leadId: string,
    testId: string,
  ): Promise<DeleteCrmLeadResultResponseDto> {
    const leadProfile = await this.accessService.ensureCrmCanAccessLeadOrThrow(
      currentUserId,
      leadId,
    );

    const deleted = await this.db.transaction(async (manager) =>
      this.academicResultWriter.deleteEnglishTestResult(manager, leadId, testId),
    );

    if (!deleted) {
      throw new NotFoundException('English test result not found');
    }

    await this.searchCacheInvalidation.invalidateAfterAcademicFormChanged(
      leadProfile.userId,
    );

    return { success: true };
  }

  private async loadLeadProfileGraphOrThrow(
    leadId: string,
  ): Promise<SysLeadProfiles> {
    const profile = await this.db.leadProfiles.findOne({
      where: { id: leadId },
      relations: CRM_LEAD_PROFILE_RELATIONS,
    });

    if (!profile) {
      throw new NotFoundException('Lead profile not found');
    }

    return profile;
  }

  private loadSystemDegrees() {
    return this.db.academicDegrees.find({
      where: { levelOrder: In(VALID_LEVEL_ORDERS) },
      order: { levelOrder: 'ASC' },
    });
  }

  private loadSystemEnglishTests() {
    return this.db.englishTests.find({
      relations: { SysEnglishTestSection: true },
    });
  }

  private ensureAcademicResultCompleteOrThrow(
    result: LeadAcademicResults,
  ): void {
    const gpaScale = Number(result.SysAcademicDegree?.gpaScale);
    const gpa =
      result.gpa == null || String(result.gpa).trim() === ''
        ? null
        : parseFloat(result.gpa);
    const institute = result.institute?.trim() ?? '';

    if (
      !institute ||
      LeadProfileService.isAcademicEditable(gpa, gpaScale)
    ) {
      throw new ValidationException(
        'Academic result is incomplete and cannot be verified',
      );
    }
  }

  private ensureEnglishTestResultCompleteOrThrow(
    result: LeadEnglishTestResults,
  ): void {
    const overallScore =
      result.overallScore == null || String(result.overallScore).trim() === ''
        ? null
        : parseFloat(result.overallScore);
    const overallMaxScore = Number(result.SysEnglishTest?.maxScore);
    const configuredSections = result.SysEnglishTest?.SysEnglishTestSection ?? [];
    const sectionResults = result.LeadEnglishTestSectionResult ?? [];

    const sectionScores = configuredSections.map((section) => {
      const sectionResult = sectionResults.find(
        (row) => row.sysEngTestSectionId === section.id,
      );
      const score =
        sectionResult?.sectionScore == null ||
        String(sectionResult.sectionScore).trim() === ''
          ? null
          : parseFloat(sectionResult.sectionScore);

      return {
        score,
        maxScore: Number(section.maxScore),
      };
    });

    if (
      LeadProfileService.isEnglishTestEditable(
        overallScore,
        overallMaxScore,
        sectionScores,
      )
    ) {
      throw new ValidationException(
        'English test result is incomplete and cannot be verified',
      );
    }
  }
}
