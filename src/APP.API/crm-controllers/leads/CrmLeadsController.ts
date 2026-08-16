import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { CrmLeadDocumentReviewService } from '@bll/crm-services/leads/CrmLeadDocumentReviewService';
import { CrmLeadProfileService } from '@bll/crm-services/leads/CrmLeadProfileService';
import { CrmLeadQueryService } from '@bll/crm-services/leads/CrmLeadQueryService';
import { CrmLeadService } from '@bll/crm-services/leads/CrmLeadService';
import { ChangeCrmApplicationDocumentStatusRequestDto } from '@shared/dtos/applications/ChangeCrmApplicationDocumentStatusRequestDto';
import { ChangeCrmApplicationDocumentStatusResponseDto } from '@shared/dtos/applications/ChangeCrmApplicationDocumentStatusResponseDto';
import { ChangeCrmLeadAcademicResultVerificationResponseDto } from '@shared/dtos/crm/leads/ChangeCrmLeadAcademicResultVerificationResponseDto';
import { ChangeCrmLeadEnglishTestResultVerificationResponseDto } from '@shared/dtos/crm/leads/ChangeCrmLeadEnglishTestResultVerificationResponseDto';
import { ChangeCrmLeadResultVerificationRequestDto } from '@shared/dtos/crm/leads/ChangeCrmLeadResultVerificationRequestDto';
import { CreateCrmLeadRequestDto } from '@shared/dtos/crm/leads/CreateCrmLeadRequestDto';
import { CreateCrmLeadResponseDto } from '@shared/dtos/crm/leads/CreateCrmLeadResponseDto';
import { CrmLeadDropdownDataResponseDto } from '@shared/dtos/crm/leads/CrmLeadDropdownDataResponseDto';
import { CrmLeadListRequestDto } from '@shared/dtos/crm/leads/CrmLeadListRequestDto';
import { CrmLeadListResponseDto } from '@shared/dtos/crm/leads/CrmLeadListResponseDto';
import { DeleteCrmLeadResultResponseDto } from '@shared/dtos/crm/leads/DeleteCrmLeadResultResponseDto';
import { GetCrmLeadProfileResponseDto } from '@shared/dtos/crm/leads/GetCrmLeadProfileResponseDto';
import { UpdateCrmLeadAcademicResultsRequestDto } from '@shared/dtos/crm/leads/UpdateCrmLeadAcademicResultsRequestDto';
import { UpdateCrmLeadAcademicResultsResponseDto } from '@shared/dtos/crm/leads/UpdateCrmLeadAcademicResultsResponseDto';
import { UpdateCrmLeadEnglishTestResultsRequestDto } from '@shared/dtos/crm/leads/UpdateCrmLeadEnglishTestResultsRequestDto';
import { UpdateCrmLeadEnglishTestResultsResponseDto } from '@shared/dtos/crm/leads/UpdateCrmLeadEnglishTestResultsResponseDto';
import { UpdateCrmLeadRequestDto } from '@shared/dtos/crm/leads/UpdateCrmLeadRequestDto';
import { UpdateCrmLeadResponseDto } from '@shared/dtos/crm/leads/UpdateCrmLeadResponseDto';
import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

@ApiTags('CRM Leads')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN, Role.COUNSELLOR)
@Controller('crm/leads')
export class CrmLeadsController {
  constructor(
    private readonly crmLeadService: CrmLeadService,
    private readonly crmLeadQueryService: CrmLeadQueryService,
    private readonly crmLeadProfileService: CrmLeadProfileService,
    private readonly crmLeadDocumentReviewService: CrmLeadDocumentReviewService,
  ) {}

  @Post()
  async createLead(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateCrmLeadRequestDto,
  ): Promise<CreateCrmLeadResponseDto> {
    return this.crmLeadService.createLead(user.userId, dto);
  }

  @Post('list')
  async getLeadList(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CrmLeadListRequestDto,
  ): Promise<CrmLeadListResponseDto> {
    return this.crmLeadQueryService.getLeadList(user.userId, dto);
  }

  @Get('dropdown-data')
  async getDropdownData(): Promise<CrmLeadDropdownDataResponseDto> {
    return this.crmLeadQueryService.getDropdownData();
  }

  @Get(':leadId/profile')
  async getLeadProfile(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
  ): Promise<GetCrmLeadProfileResponseDto> {
    return this.crmLeadProfileService.getLeadProfile(user.userId, leadId);
  }

  @Put(':leadId/academic-results')
  async updateAcademicResults(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: UpdateCrmLeadAcademicResultsRequestDto,
  ): Promise<UpdateCrmLeadAcademicResultsResponseDto> {
    return this.crmLeadProfileService.updateAcademicResults(
      user.userId,
      leadId,
      dto,
    );
  }

  @Post(':leadId/academic-results/:degreeId/verification-status-changes')
  async changeAcademicResultVerification(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('degreeId', ParseUUIDPipe) degreeId: string,
    @Body() dto: ChangeCrmLeadResultVerificationRequestDto,
  ): Promise<ChangeCrmLeadAcademicResultVerificationResponseDto> {
    return this.crmLeadProfileService.changeAcademicResultVerification(
      user.userId,
      leadId,
      degreeId,
      dto,
    );
  }

  @Delete(':leadId/academic-results/:degreeId')
  async deleteAcademicResult(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('degreeId', ParseUUIDPipe) degreeId: string,
  ): Promise<DeleteCrmLeadResultResponseDto> {
    return this.crmLeadProfileService.deleteAcademicResult(
      user.userId,
      leadId,
      degreeId,
    );
  }

  @Put(':leadId/english-test-results')
  async updateEnglishTestResults(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: UpdateCrmLeadEnglishTestResultsRequestDto,
  ): Promise<UpdateCrmLeadEnglishTestResultsResponseDto> {
    return this.crmLeadProfileService.updateEnglishTestResults(
      user.userId,
      leadId,
      dto,
    );
  }

  @Post(':leadId/english-test-results/:testId/verification-status-changes')
  async changeEnglishTestResultVerification(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('testId', ParseUUIDPipe) testId: string,
    @Body() dto: ChangeCrmLeadResultVerificationRequestDto,
  ): Promise<ChangeCrmLeadEnglishTestResultVerificationResponseDto> {
    return this.crmLeadProfileService.changeEnglishTestResultVerification(
      user.userId,
      leadId,
      testId,
      dto,
    );
  }

  @Delete(':leadId/english-test-results/:testId')
  async deleteEnglishTestResult(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('testId', ParseUUIDPipe) testId: string,
  ): Promise<DeleteCrmLeadResultResponseDto> {
    return this.crmLeadProfileService.deleteEnglishTestResult(
      user.userId,
      leadId,
      testId,
    );
  }

  @Post(':leadId/documents/:documentId/status-changes')
  async changeLeadDocumentStatus(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: ChangeCrmApplicationDocumentStatusRequestDto,
  ): Promise<ChangeCrmApplicationDocumentStatusResponseDto> {
    return this.crmLeadDocumentReviewService.changeLeadDocumentStatus(
      user.userId,
      leadId,
      documentId,
      dto,
    );
  }

  @Put(':leadId')
  async updateLead(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: UpdateCrmLeadRequestDto,
  ): Promise<UpdateCrmLeadResponseDto> {
    return this.crmLeadService.updateLead(user.userId, leadId, dto);
  }
}
