import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MetaInformationItemDto {
  @ApiPropertyOptional({ description: 'Subtitle for this block' })
  subtitle?: string;

  @ApiProperty({ description: 'Description paragraphs', type: [String] })
  description!: string[];
}

export class MetaItemDto {
  @ApiProperty({
    description:
      'Key used to link from courseDetails (e.g. rankingMetaData)',
  })
  infoKey!: string;

  @ApiProperty({ description: 'Display title' })
  title!: string;

  @ApiProperty({
    type: [MetaInformationItemDto],
    description: 'Content blocks',
  })
  information!: MetaInformationItemDto[];
}
