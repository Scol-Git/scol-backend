import { ApiProperty } from '@nestjs/swagger';

export class CreateUploadUrlResponseDto {
  @ApiProperty({
    description: 'Presigned URL for direct upload to storage',
    example: 'https://s3.us-west-002.backblazeb2.com/bucket/documents/...',
  })
  uploadUrl!: string;

  @ApiProperty({
    description: 'Document version ID to use in confirm-upload',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  versionId!: string;

  @ApiProperty({
    description: 'Document ID (for reference)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  documentId!: string;
}
