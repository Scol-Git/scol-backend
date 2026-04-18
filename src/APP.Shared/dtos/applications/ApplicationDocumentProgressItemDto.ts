import { ApiProperty } from '@nestjs/swagger';
import { ApplicationDocumentChecklistDocumentTypeDto } from './ApplicationDocumentChecklistItemDto';

export class ApplicationDocumentProgressItemDto {
  @ApiProperty({ type: ApplicationDocumentChecklistDocumentTypeDto })
  documentType!: ApplicationDocumentChecklistDocumentTypeDto;

  @ApiProperty({ example: 1 })
  order!: number;

  @ApiProperty({ example: 'SATISFIED', nullable: true })
  overallStatus!: string | null;
}
