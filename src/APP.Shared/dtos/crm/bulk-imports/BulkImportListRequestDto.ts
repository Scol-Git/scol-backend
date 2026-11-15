import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';
import { BulkImportStatus } from '@shared/enums/crm/BulkImportStatus.enum';

export class BulkImportListRequestDto {
  @ApiPropertyOptional({ enum: BulkImportType })
  @IsOptional()
  @IsEnum(BulkImportType)
  type?: BulkImportType;

  @ApiPropertyOptional({ enum: BulkImportStatus })
  @IsOptional()
  @IsEnum(BulkImportStatus)
  status?: BulkImportStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
