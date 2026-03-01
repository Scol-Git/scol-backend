import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { Role } from '@shared/enums/Role.enum';
import { DataEntryService } from '@bll/services/data-entry/DataEntryService';
import { DataEntryImportRequestDto } from '@shared/dtos/data-entry/DataEntryImportRequestDto';
import { DataEntryImportResponseDto } from '@shared/dtos/data-entry/DataEntryImportResponseDto';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';

@ApiTags('data-entry')
@Controller('data-entry')
export class DataEntryController {
  constructor(private readonly dataEntryService: DataEntryService) {}

  @Post('csv/import')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Import uni CSV from URL: download to data/, process, write reviewed + errors to data/, return counts',
  })
  @ApiResponse({
    status: 200,
    description: 'Import completed. Response body (in standard envelope) includes universityUpdated and errorsCount.',
    type: DataEntryImportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (e.g. invalid CSV URL, fetch failed, or missing required CSV headers).',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable (e.g. database unreachable).',
    type: ErrorResponseDto,
  })
  async importCsv(@Body() dto: DataEntryImportRequestDto) {
    const result = await this.dataEntryService.importUniCsv(dto.uniCsvUrl);
    return {
      message: 'Import completed.',
      universityUpdated: result.reviewedCount,
      errorsCount: result.errorsCount,
    };
  }
}
