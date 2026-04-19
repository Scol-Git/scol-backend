import {
  Body,
  Controller,
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
import { GenerateApplicationDocumentUploadUrlRequestDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlRequestDto';
import { GenerateApplicationDocumentUploadUrlResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlResponseDto';

@Controller('applications')
export class ApplicationDocumentsController {
  constructor(
    private readonly applicationDocumentService: ApplicationDocumentService,
  ) {}

  @Post(':applicationId/document-types/:documentTypeId/upload-url')
  @UseGuards(JwtAuthGuard)
  @RequireRole(Role.LEAD)
  @ApiBearerAuth('JWT-auth')
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
}
