import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { Role } from '@shared/enums/Role.enum';
import { BulkImportService } from '@bll/services/data-entry/BulkImportService';
import { DataEntryImportResponseDto } from '@shared/dtos/data-entry/DataEntryImportResponseDto';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';

@ApiTags('data-entry')
@Controller('data-entry')
export class DataEntryController {
  constructor(private readonly bulkImportService: BulkImportService) {}

  @Post('import/university')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Trigger university CSV import from Staging folder',
    description:
      'Reads the single CSV in BulkImport/University/Staging, processes it, writes Reviewed/Errors, archives the file. No request body.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Import completed or skipped (no file). Returns universityUpdated and errorsCount.',
    type: DataEntryImportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request (e.g. more than one file in Staging, or invalid CSV headers).',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable (e.g. database unreachable).',
    type: ErrorResponseDto,
  })
  async importUniversity() {
    return this.runUniversityImport();
  }

  @Post('import/course')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Trigger course CSV import from Staging folder',
    description:
      'Reads the single CSV in BulkImport/Course/Staging (same columns as sys_course_details_template.csv), processes it, writes Reviewed/Errors, archives the file.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Import completed or skipped (no file). Returns coursesUpdated and errorsCount.',
    type: DataEntryImportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request (e.g. more than one file in Staging, or invalid CSV headers).',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable (e.g. database unreachable).',
    type: ErrorResponseDto,
  })
  async importCourse() {
    return this.runCourseImport();
  }

  private async runUniversityImport() {
    const result = await this.bulkImportService.importUniCsv();
    return {
      message: 'Import completed.',
      universityUpdated: result.reviewedCount,
      errorsCount: result.errorsCount,
    };
  }

  private async runCourseImport() {
    const result = await this.bulkImportService.importCourseCsv();
    return {
      message: 'Import completed.',
      coursesUpdated: result.reviewedCount,
      errorsCount: result.errorsCount,
    };
  }
}
