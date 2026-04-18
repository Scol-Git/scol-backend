import { ApiProperty } from '@nestjs/swagger';
import { ApplicationUploadedDocumentDto } from './ApplicationUploadedDocumentDto';

/** Document type block for a checklist row (backed by ApplicationRequiredDocuments). */
export class ApplicationDocumentChecklistDocumentTypeDto {
  /**
   * Snapshot requirement row id (`ApplicationRequiredDocuments.id`), not `SysDocumentTypes.id`.
   */
  @ApiProperty({
    format: 'uuid',
    description: 'Document type id',
  })
  documentTypeId!: string;

  @ApiProperty({ example: 'TRANSCRIPT' })
  documentTypeCode!: string;

  @ApiProperty({ example: 'Transcript' })
  documentTypeName!: string;
}

export class ApplicationDocumentChecklistItemDto {
  @ApiProperty({ type: ApplicationDocumentChecklistDocumentTypeDto })
  documentType!: ApplicationDocumentChecklistDocumentTypeDto;

  @ApiProperty()
  isRequired!: boolean;

  @ApiProperty()
  isMultipleAllowed!: boolean;

  @ApiProperty({ example: 'SATISFIED', nullable: true })
  overallStatus!: string | null;

  @ApiProperty({
    example: 'application/pdf,image/jpeg,image/png',
    nullable: true,
  })
  allowedMimeTypes!: string | null;

  @ApiProperty({ example: 1024000, nullable: true })
  maxFileSizeBytes!: number | null;

  @ApiProperty({ type: [ApplicationUploadedDocumentDto] })
  uploadedDocuments!: ApplicationUploadedDocumentDto[];
}
