import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, MaxLength, Min } from 'class-validator';
import { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';

export class GenerateBulkImportUploadUrlRequestDto {
  @ApiProperty({ enum: BulkImportType })
  @IsEnum(BulkImportType)
  type!: BulkImportType;

  @ApiProperty({ example: 'university.csv' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 52311, description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  fileSizeBytes!: number;
}
