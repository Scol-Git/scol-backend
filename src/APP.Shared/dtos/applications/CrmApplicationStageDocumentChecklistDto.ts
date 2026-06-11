import { ApiProperty } from '@nestjs/swagger';
import { ApplicationDocumentChecklistItemDto } from './ApplicationDocumentChecklistItemDto';

export class CrmApplicationStageDocumentChecklistDto {
  @ApiProperty({ example: 'REVIEW' })
  stageCode!: string;

  @ApiProperty({ example: 'Review' })
  stageName!: string;

  @ApiProperty({ example: 1, nullable: true })
  order!: number | null;

  @ApiProperty({ type: [ApplicationDocumentChecklistItemDto] })
  documentChecklistItems!: ApplicationDocumentChecklistItemDto[];
}
