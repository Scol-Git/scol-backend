import { ApiProperty } from '@nestjs/swagger';
import { ApplicationOverviewDto } from './ApplicationOverviewDto';
import { ApplicationDocumentChecklistItemDto } from './ApplicationDocumentChecklistItemDto';

export class GetApplicationDetailsResponseDto {
  @ApiProperty({ format: 'uuid' })
  applicationId!: string;

  @ApiProperty({
    example: 'APP-2025-0001',
    nullable: true,
  })
  applicationSerialNumber!: string | null;

  @ApiProperty({ type: ApplicationOverviewDto })
  applicationOverview!: ApplicationOverviewDto;

  @ApiProperty({ type: [ApplicationDocumentChecklistItemDto] })
  documentCheckLists!: ApplicationDocumentChecklistItemDto[];
}
