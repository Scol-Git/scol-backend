import { ApiProperty } from '@nestjs/swagger';

export class GenerateApplicationDocumentUploadUrlHeadersDto {
  @ApiProperty({ example: 'application/pdf' })
  'Content-Type'!: string;
}

export class GenerateApplicationDocumentUploadUrlResponseDto {
  @ApiProperty({
    description:
      'Polymorphic: ApplicationDocuments.id (APPLICATION scope) or LeadDocuments.id (LEAD scope)',
  })
  documentId!: string;

  @ApiProperty({
    description:
      'Polymorphic: ApplicationDocumentVersions.id (APPLICATION scope) or LeadDocumentVersions.id (LEAD scope)',
  })
  documentVersionId!: string;

  @ApiProperty()
  uploadUrl!: string;

  @ApiProperty({ type: GenerateApplicationDocumentUploadUrlHeadersDto })
  headers!: GenerateApplicationDocumentUploadUrlHeadersDto;

  @ApiProperty({ example: 900 })
  expiresInSeconds!: number;
}
