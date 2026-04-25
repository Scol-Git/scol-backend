import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { CrmApplicationDocumentService } from '@bll/crm-services/applications/CrmApplicationDocumentService';
import { ConfirmApplicationDocumentUploadRequestDto } from '@shared/dtos/applications/ConfirmApplicationDocumentUploadRequestDto';
import { ConfirmApplicationDocumentUploadResponseDto } from '@shared/dtos/applications/ConfirmApplicationDocumentUploadResponseDto';
import { GenerateApplicationDocumentDownloadResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentDownloadResponseDto';
import { GenerateApplicationDocumentUploadUrlRequestDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlRequestDto';
import { GenerateApplicationDocumentUploadUrlResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlResponseDto';
import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

@ApiTags('CRM Application Documents')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN, Role.COUNSELLOR)
@Controller('crm/leads/:leadId/applications/:applicationId')
export class CrmApplicationDocumentsController {
  constructor(
    private readonly crmApplicationDocumentService: CrmApplicationDocumentService,
  ) {}

  @Post('document-types/:documentTypeId/upload-url')
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
}
