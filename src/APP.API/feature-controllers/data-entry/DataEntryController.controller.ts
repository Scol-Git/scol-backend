import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { Role } from '@shared/enums/Role.enum';
import { DataEntryService } from '@bll/services/data-entry/DataEntryService';
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
    summary: 'Trigger university CSV import from Staging folder',
    description: 'Reads the single CSV in BulkImport/University/Staging, processes it, writes Reviewed/Errors, archives the file. No request body.',
  })
  @ApiResponse({
    status: 200,
    description: 'Import completed or skipped (no file). Returns universityUpdated and errorsCount.',
    type: DataEntryImportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (e.g. more than one file in Staging, or invalid CSV headers).',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable (e.g. database unreachable).',
    type: ErrorResponseDto,
  })
  async importCsv() {
    const result = await this.dataEntryService.importUniCsv();
    return {
      message: 'Import completed.',
      universityUpdated: result.reviewedCount,
      errorsCount: result.errorsCount,
    };
  }
}
