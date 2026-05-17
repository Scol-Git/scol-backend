import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import type { ICurrentUser } from '@shared/interfaces/domain';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { Role } from '@shared/enums/Role.enum';
import { ApplicationDocumentService } from '@bll/services/applications/ApplicationDocumentService';
import { ConfirmApplicationDocumentUploadRequestDto } from '@shared/dtos/applications/ConfirmApplicationDocumentUploadRequestDto';
import { ConfirmApplicationDocumentUploadResponseDto } from '@shared/dtos/applications/ConfirmApplicationDocumentUploadResponseDto';
import { GenerateApplicationDocumentDownloadResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentDownloadResponseDto';
import { GenerateApplicationDocumentUploadUrlRequestDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlRequestDto';
import { GenerateApplicationDocumentUploadUrlResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlResponseDto';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';

@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.LEAD)
@Controller('applications')
export class ApplicationDocumentsController {
  constructor(
    private readonly applicationDocumentService: ApplicationDocumentService,
  ) {}

  @Post(':applicationId/document-types/:documentTypeId/upload-url')
  async generateUploadUrl(
    @CurrentUser() user: ICurrentUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentTypeId', ParseUUIDPipe) documentTypeId: string,
    @Body() dto: GenerateApplicationDocumentUploadUrlRequestDto,
  ): Promise<GenerateApplicationDocumentUploadUrlResponseDto> {
    return await this.applicationDocumentService.generateUploadUrl(
      user.userId,
      applicationId,
      documentTypeId,
      dto,
    );
  }

  @Post(':applicationId/document-types/:documentTypeId/confirm-upload')
  async confirmUpload(
    @CurrentUser() user: ICurrentUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentTypeId', ParseUUIDPipe) applicationRequirementId: string,
    @Body() dto: ConfirmApplicationDocumentUploadRequestDto,
  ): Promise<ConfirmApplicationDocumentUploadResponseDto> {
    return await this.applicationDocumentService.confirmUpload(
      user.userId,
      applicationId,
      applicationRequirementId,
      dto,
    );
  }

  @Get(':applicationId/documents/:documentId/download')
  async downloadDocument(
    @CurrentUser() user: ICurrentUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<GenerateApplicationDocumentDownloadResponseDto> {
    return await this.applicationDocumentService.generateDownloadUrl(
      user.userId,
      applicationId,
      documentId,
    );
  }

  @Delete(':applicationId/documents/:documentId')
  async deleteApplicationDocument(
    @CurrentUser() user: ICurrentUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<{ success: true }> {
    return this.applicationDocumentService.deleteApplicationDocument(
      user.userId,
      applicationId,
      documentId,
    );
  }
}
