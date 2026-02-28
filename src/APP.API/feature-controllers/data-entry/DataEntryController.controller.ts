import { Controller, Post, Body, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';

import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { Role } from '@shared/enums/Role.enum';
import { DataEntryService } from '@bll/services/data-entry/DataEntryService';
import { DataEntryImportRequestDto } from '@shared/dtos/data-entry/DataEntryImportRequestDto';

@ApiTags('data-entry')
@Controller('data-entry')
export class DataEntryController {
  constructor(private readonly dataEntryService: DataEntryService) {}

  @Post('csv/import')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Import uni CSV from URL: download to data/, process, write reviewed + errors to data/, return 200',
  })
  async importCsv(
    @Body() dto: DataEntryImportRequestDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    await this.dataEntryService.importUniCsv(dto.uniCsvUrl);
    res.status(200).end();
  }
}
