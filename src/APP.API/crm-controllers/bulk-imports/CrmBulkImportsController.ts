import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import '../common/swagger/bulk-imports/swagger.doc';
import { BulkImportBatchService } from '@bll/crm-services/bulk-imports/BulkImportBatchService';
import { PublishService } from '@bll/crm-services/publishing/PublishService';
import { GenerateBulkImportUploadUrlRequestDto } from '@shared/dtos/crm/bulk-imports/GenerateBulkImportUploadUrlRequestDto';
import { GenerateBulkImportUploadUrlResponseDto } from '@shared/dtos/crm/bulk-imports/GenerateBulkImportUploadUrlResponseDto';
import { ConfirmBulkImportUploadResponseDto } from '@shared/dtos/crm/bulk-imports/ConfirmBulkImportUploadResponseDto';
import { BulkImportStatusResponseDto } from '@shared/dtos/crm/bulk-imports/BulkImportStatusResponseDto';
import { BulkImportListRequestDto } from '@shared/dtos/crm/bulk-imports/BulkImportListRequestDto';
import { BulkImportListItemDto } from '@shared/dtos/crm/bulk-imports/BulkImportListItemDto';
import { BulkImportListResponseDto } from '@shared/dtos/crm/bulk-imports/BulkImportListResponseDto';
import { BulkImportDetailResponseDto } from '@shared/dtos/crm/bulk-imports/BulkImportDetailResponseDto';
import { BulkImportDownloadResponseDto } from '@shared/dtos/crm/bulk-imports/BulkImportDownloadResponseDto';
import {
  BlockingIssueDto,
  PublishCountsDto,
  PublishPreviewResponseDto,
} from '@shared/dtos/crm/bulk-imports/PublishPreviewResponseDto';
import { PublishResultResponseDto } from '@shared/dtos/crm/bulk-imports/PublishResultResponseDto';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';
import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

const TEMPLATE_TYPES = ['university', 'course'] as const;
type TemplateType = (typeof TEMPLATE_TYPES)[number];

@ApiTags('CRM Bulk Imports')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  SuccessResponseDto,
  ErrorResponseDto,
  GenerateBulkImportUploadUrlResponseDto,
  ConfirmBulkImportUploadResponseDto,
  BulkImportStatusResponseDto,
  BulkImportListItemDto,
  BulkImportListResponseDto,
  BulkImportDetailResponseDto,
  BulkImportDownloadResponseDto,
  PublishCountsDto,
  BlockingIssueDto,
  PublishPreviewResponseDto,
  PublishResultResponseDto,
)
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN)
@Controller('crm/bulk-imports')
export class CrmBulkImportsController {
  constructor(
    private readonly batchService: BulkImportBatchService,
    private readonly publishService: PublishService,
  ) {}

  // NOTE: `templates/...` is declared first so it is matched before `:batchId`.
  @Get('templates/:type/download')
  @ApiOperation({
    summary: 'Download a CSV template',
    description: 'Header row + one example row, generated from the import schema. `type` = university | course.',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({ description: 'CSV file' })
  downloadTemplate(
    @Param('type') type: string,
    @Res({ passthrough: false }) res: Response,
  ): void {
    if (!TEMPLATE_TYPES.includes(type as TemplateType)) {
      throw new BadRequestException('type must be one of: university, course');
    }
    const { buffer, fileName } = this.batchService.getTemplate(type as TemplateType);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }

  @Post('upload-url')
  @AddSwaggerDoc('crmBulkImports', 'generateUploadUrl')
  async generateUploadUrl(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: GenerateBulkImportUploadUrlRequestDto,
  ): Promise<GenerateBulkImportUploadUrlResponseDto> {
    return this.batchService.generateUploadUrl(user.userId, dto);
  }

  @Get()
  @AddSwaggerDoc('crmBulkImports', 'list')
  async list(@Query() query: BulkImportListRequestDto): Promise<BulkImportListResponseDto> {
    return this.batchService.list(query);
  }

  @Post(':batchId/confirm-upload')
  @HttpCode(202)
  @AddSwaggerDoc('crmBulkImports', 'confirmUpload')
  async confirmUpload(
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ): Promise<ConfirmBulkImportUploadResponseDto> {
    return this.batchService.confirmUpload(batchId);
  }

  @Get(':batchId/status')
  @AddSwaggerDoc('crmBulkImports', 'getStatus')
  async getStatus(
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ): Promise<BulkImportStatusResponseDto> {
    return this.batchService.getStatus(batchId);
  }

  @Get(':batchId/original-file/download')
  @AddSwaggerDoc('crmBulkImports', 'downloadOriginal')
  async downloadOriginal(
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ): Promise<BulkImportDownloadResponseDto> {
    return this.batchService.getOriginalDownload(batchId);
  }

  @Get(':batchId/errors-file/download')
  @AddSwaggerDoc('crmBulkImports', 'downloadErrors')
  async downloadErrors(
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ): Promise<BulkImportDownloadResponseDto> {
    return this.batchService.getErrorsDownload(batchId);
  }

  @Get(':batchId/publish-preview')
  @AddSwaggerDoc('crmBulkImports', 'publishPreview')
  async publishPreview(
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ): Promise<PublishPreviewResponseDto> {
    return this.publishService.previewBatch(batchId);
  }

  @Post(':batchId/publish')
  @HttpCode(200)
  @AddSwaggerDoc('crmBulkImports', 'publish')
  async publish(
    @CurrentUser() user: ICurrentUser,
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ): Promise<PublishResultResponseDto> {
    return this.publishService.publishBatch(batchId, user.userId);
  }

  @Get(':batchId')
  @AddSwaggerDoc('crmBulkImports', 'getDetail')
  async getDetail(
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ): Promise<BulkImportDetailResponseDto> {
    return this.batchService.getDetail(batchId);
  }

  @Delete(':batchId')
  @AddSwaggerDoc('crmBulkImports', 'discard')
  async discard(
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ): Promise<BulkImportStatusResponseDto> {
    await this.publishService.discardBatch(batchId);
    return this.batchService.getStatus(batchId);
  }
}
