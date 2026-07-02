import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CursorPaginationDto } from '@shared/dtos/search/CursorPaginationDto';
import { ApplicationStage } from '@shared/enums/ApplicationStage.enum';
import { ApplicationStatus } from '@shared/enums/ApplicationStatus.enum';

export class CrmApplicationFiltersDto {
  @ApiPropertyOptional({ enum: ApplicationStatus, isArray: true })
  @IsEnum(ApplicationStatus, { each: true })
  @IsArray()
  @IsOptional()
  ApplicationStatuses?: ApplicationStatus[];

  @ApiPropertyOptional({ enum: ApplicationStage, isArray: true })
  @IsEnum(ApplicationStage, { each: true })
  @IsArray()
  @IsOptional()
  ApplicationStages?: ApplicationStage[];

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsUUID('4', { each: true })
  @IsArray()
  @IsOptional()
  consultantIds?: string[];
}

export class CrmApplicationDateRangeDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class CrmApplicationRangesDto {
  @ApiPropertyOptional({ type: CrmApplicationDateRangeDto })
  @ValidateNested()
  @Type(() => CrmApplicationDateRangeDto)
  @IsOptional()
  dateRange?: CrmApplicationDateRangeDto;
}

export class CrmApplicationListRequestDto {
  @ApiPropertyOptional({ type: CursorPaginationDto })
  @ValidateNested()
  @Type(() => CursorPaginationDto)
  @IsOptional()
  pagination?: CursorPaginationDto;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  searchText?: string;

  @ApiPropertyOptional({ type: CrmApplicationFiltersDto })
  @ValidateNested()
  @Type(() => CrmApplicationFiltersDto)
  @IsOptional()
  filters?: CrmApplicationFiltersDto;

  @ApiPropertyOptional({ type: CrmApplicationRangesDto })
  @ValidateNested()
  @Type(() => CrmApplicationRangesDto)
  @IsOptional()
  ranges?: CrmApplicationRangesDto;
}
