import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import '../common/swagger/applications/swagger.doc';
import { CrmApplicationDocumentService } from '@bll/crm-services/applications/CrmApplicationDocumentService';
import { CrmApplicationDocumentReviewService } from '@bll/crm-services/applications/CrmApplicationDocumentReviewService';
import { ChangeCrmApplicationDocumentStatusRequestDto } from '@shared/dtos/applications/ChangeCrmApplicationDocumentStatusRequestDto';
import { ChangeCrmApplicationDocumentStatusResponseDto } from '@shared/dtos/applications/ChangeCrmApplicationDocumentStatusResponseDto';
import { ChangeCrmApplicationRequirementStatusRequestDto } from '@shared/dtos/applications/ChangeCrmApplicationRequirementStatusRequestDto';
import { ChangeCrmApplicationRequirementStatusResponseDto } from '@shared/dtos/applications/ChangeCrmApplicationRequirementStatusResponseDto';
import { ConfirmApplicationDocumentUploadRequestDto } from '@shared/dtos/applications/ConfirmApplicationDocumentUploadRequestDto';
import { ConfirmApplicationDocumentUploadResponseDto } from '@shared/dtos/applications/ConfirmApplicationDocumentUploadResponseDto';
import { GenerateApplicationDocumentDownloadResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentDownloadResponseDto';
import { GenerateApplicationDocumentUploadUrlRequestDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlRequestDto';
import { GenerateApplicationDocumentUploadUrlResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlResponseDto';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';
import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

@ApiTags('CRM Application Documents')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  SuccessResponseDto,
  ErrorResponseDto,
  GenerateApplicationDocumentUploadUrlResponseDto,
  ConfirmApplicationDocumentUploadResponseDto,
  GenerateApplicationDocumentDownloadResponseDto,
  ChangeCrmApplicationDocumentStatusResponseDto,
  ChangeCrmApplicationRequirementStatusResponseDto,
)
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN, Role.COUNSELLOR)
@Controller('crm/leads/:leadId/applications/:applicationId')
export class CrmApplicationDocumentsController {
  constructor(
    private readonly crmApplicationDocumentService: CrmApplicationDocumentService,
    private readonly crmApplicationDocumentReviewService: CrmApplicationDocumentReviewService,
  ) {}

  @Post('document-types/:documentTypeId/upload-url')
  @AddSwaggerDoc('crmApplicationDocuments', 'generateUploadUrl')
  async generateUploadUrl(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentTypeId', ParseUUIDPipe) applicationRequirementId: string,
    @Body() dto: GenerateApplicationDocumentUploadUrlRequestDto,
  ): Promise<GenerateApplicationDocumentUploadUrlResponseDto> {
    return this.crmApplicationDocumentService.generateUploadUrl(
      user.userId,
      leadId,
      applicationId,
      applicationRequirementId,
      dto,
    );
  }

  @Post('document-types/:documentTypeId/confirm-upload')
  @AddSwaggerDoc('crmApplicationDocuments', 'confirmUpload')
  async confirmUpload(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentTypeId', ParseUUIDPipe) applicationRequirementId: string,
    @Body() dto: ConfirmApplicationDocumentUploadRequestDto,
  ): Promise<ConfirmApplicationDocumentUploadResponseDto> {
    return this.crmApplicationDocumentService.confirmUpload(
      user.userId,
      leadId,
      applicationId,
      applicationRequirementId,
      dto,
    );
  }

  @Get('documents/:documentId/download')
  @AddSwaggerDoc('crmApplicationDocuments', 'downloadDocument')
  async downloadDocument(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<GenerateApplicationDocumentDownloadResponseDto> {
    return this.crmApplicationDocumentService.generateDownloadUrl(
      user.userId,
      leadId,
      applicationId,
      documentId,
    );
  }

  @Post('documents/:documentId/status-changes')
  @AddSwaggerDoc('crmApplicationDocuments', 'changeDocumentStatus')
  async changeDocumentStatus(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: ChangeCrmApplicationDocumentStatusRequestDto,
  ): Promise<ChangeCrmApplicationDocumentStatusResponseDto> {
    return this.crmApplicationDocumentReviewService.changeDocumentStatus(
      user.userId,
      leadId,
      applicationId,
      documentId,
      dto,
    );
  }

  @Post('document-types/:documentTypeId/status-changes')
  @AddSwaggerDoc('crmApplicationDocuments', 'changeRequirementStatus')
  async changeRequirementStatus(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentTypeId', ParseUUIDPipe) applicationRequirementId: string,
    @Body() dto: ChangeCrmApplicationRequirementStatusRequestDto,
  ): Promise<ChangeCrmApplicationRequirementStatusResponseDto> {
    return this.crmApplicationDocumentReviewService.changeRequirementStatus(
      user.userId,
      leadId,
      applicationId,
      applicationRequirementId,
      dto,
    );
  }
}
