import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { PublishStatus } from '@shared/enums/crm/PublishStatus.enum';

export class CrmUniversityListRequestDto {
  @ApiPropertyOptional({ enum: PublishStatus, default: PublishStatus.ALL })
  @IsOptional()
  @IsEnum(PublishStatus)
  publishStatus?: PublishStatus;

  @ApiPropertyOptional({ description: 'Only universities owned by this bulk import batch' })
  @IsOptional()
  @IsUUID()
  importBatchId?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive match on university name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

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
