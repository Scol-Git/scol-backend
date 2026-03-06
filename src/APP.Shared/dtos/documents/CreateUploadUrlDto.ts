import {
  IsInt,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUploadUrlDto {
  @IsUUID('4', { message: 'documentTypeId must be a valid UUID' })
  @ApiProperty({
    description: 'Document type ID from sys_DocumentTypes',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  documentTypeId!: string;

  @IsString()
  @MinLength(1, { message: 'mimeType is required' })
  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  mimeType!: string;

  @IsString()
  @MinLength(1, { message: 'fileName is required' })
  @ApiProperty({
    description: 'Original file name',
    example: 'passport.pdf',
  })
  fileName!: string;

  @IsInt()
  @Min(1, { message: 'fileSizeBytes must be at least 1' })
  @ApiProperty({
    description: 'File size in bytes',
    example: 102400,
    minimum: 1,
  })
  fileSizeBytes!: number;
}
