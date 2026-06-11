import { ApiProperty } from '@nestjs/swagger';
import { ApplicationOverviewDto } from './ApplicationOverviewDto';
import { CrmApplicationStageDocumentChecklistDto } from './CrmApplicationStageDocumentChecklistDto';

export class GetCrmApplicationDetailsResponseDto {
  @ApiProperty({ format: 'uuid' })
  applicationId!: string;

  @ApiProperty({
    example: 'APP-2025-0001',
    nullable: true,
  })
  applicationSerialNumber!: string | null;

  @ApiProperty({ type: ApplicationOverviewDto })
  applicationOverview!: ApplicationOverviewDto;

  @ApiProperty({ type: [CrmApplicationStageDocumentChecklistDto] })
  documentCheckLists!: CrmApplicationStageDocumentChecklistDto[];
}
