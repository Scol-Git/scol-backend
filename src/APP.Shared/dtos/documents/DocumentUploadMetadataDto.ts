import { IsInt, IsString, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Shared file metadata for document upload and re-upload requests.
 */
export class DocumentUploadMetadataDto {
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
