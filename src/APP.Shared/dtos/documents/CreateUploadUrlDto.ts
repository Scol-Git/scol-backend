import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentUploadMetadataDto } from './DocumentUploadMetadataDto';

export class CreateUploadUrlDto extends DocumentUploadMetadataDto {
  @IsUUID('4', { message: 'documentTypeId must be a valid UUID' })
  @ApiProperty({
    description: 'Document type ID from sys_DocumentTypes',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  documentTypeId!: string;
}
