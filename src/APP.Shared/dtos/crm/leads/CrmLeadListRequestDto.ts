import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CursorPaginationDto } from '@shared/dtos/search/CursorPaginationDto';
import { EnrollmentStatus } from '@shared/enums/crm/EnrollmentStatus.enum';
import { LeadStatus } from '@shared/enums/crm/LeadStatus.enum';
import { RegisterSource } from '@shared/enums/crm/RegisterSource.enum';

export class CrmLeadFiltersDto {
  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsUUID('4', { each: true })
  @IsArray()
  @IsOptional()
  targetCountryIds?: string[];

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsUUID('4', { each: true })
  @IsArray()
  @IsOptional()
  consultantIds?: string[];

  @ApiPropertyOptional({ enum: LeadStatus, isArray: true })
  @IsEnum(LeadStatus, { each: true })
  @IsArray()
  @IsOptional()
  leadStatuses?: LeadStatus[];

  @ApiPropertyOptional({ enum: RegisterSource, isArray: true })
  @IsEnum(RegisterSource, { each: true })
  @IsArray()
  @IsOptional()
  registerSources?: RegisterSource[];

  @ApiPropertyOptional({ enum: EnrollmentStatus, isArray: true })
  @IsEnum(EnrollmentStatus, { each: true })
  @IsArray()
  @IsOptional()
  enrollmentStatuses?: EnrollmentStatus[];
}

export class CrmLeadRangesDto {
  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class CrmLeadFlagsDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  hasPassedEnglishTest?: boolean;
}

export class CrmLeadListRequestDto {
  @ApiPropertyOptional({ type: CursorPaginationDto })
  @ValidateNested()
  @Type(() => CursorPaginationDto)
  @IsOptional()
  pagination?: CursorPaginationDto;

  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  searchText?: string;

  @ApiPropertyOptional({ type: CrmLeadFiltersDto })
  @ValidateNested()
  @Type(() => CrmLeadFiltersDto)
  @IsOptional()
  filters?: CrmLeadFiltersDto;

  @ApiPropertyOptional({ type: CrmLeadRangesDto })
  @ValidateNested()
  @Type(() => CrmLeadRangesDto)
  @IsOptional()
  ranges?: CrmLeadRangesDto;

  @ApiPropertyOptional({ type: CrmLeadFlagsDto })
  @ValidateNested()
  @Type(() => CrmLeadFlagsDto)
  @IsOptional()
  flags?: CrmLeadFlagsDto;
}
