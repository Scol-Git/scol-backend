import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommissionType } from '@shared/enums/CommissionType.enum';
import { MetaDataItemDto } from '@shared/dtos/common/MetaDataItemDto';

export const UNIVERSITY_UPDATABLE_FIELDS = [
  'uniName',
  'website',
  'logoUrl',
  'coverImageUrl',
  'aboutUs',
  'address',
  'campusLifeLinks',
  'establishedYear',
  'universityType',
  'currRanking',
  'locationMapMetaData',
  'sysCountryId',
  'sysStateId',
  'sysCityId',
  'commission',
  'commissionType',
  'rankingMetaData',
] as const;

export type UniversityUpdatableField =
  (typeof UNIVERSITY_UPDATABLE_FIELDS)[number];

export class UpdateCrmUniversityRequestDto {
  @ApiPropertyOptional({ example: 'University of Leeds' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  uniName?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  website?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logoUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverImageUrl?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Paragraphs separated by blank lines (\\n\\n)',
  })
  @IsOptional()
  @IsString()
  aboutUs?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  campusLifeLinks?: string[] | null;

  @ApiPropertyOptional({ example: 1904, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(9999)
  establishedYear?: number | null;

  @ApiPropertyOptional({ example: 'Public', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  universityType?: string | null;

  @ApiPropertyOptional({ example: 142, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currRanking?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  locationMapMetaData?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  sysCountryId?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  sysStateId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  sysCityId?: string | null;

  @ApiPropertyOptional({ example: '12.50', nullable: true })
  @IsOptional()
  @IsNumberString()
  commission?: string | null;

  @ApiPropertyOptional({
    enum: CommissionType,
    nullable: true,
    example: CommissionType.PERCENTAGE,
  })
  @IsOptional()
  @IsEnum(CommissionType)
  commissionType?: CommissionType | null;

  @ApiPropertyOptional({ type: [MetaDataItemDto], nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaDataItemDto)
  rankingMetaData?: MetaDataItemDto[] | null;
}
