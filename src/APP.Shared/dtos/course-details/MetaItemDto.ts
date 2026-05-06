import { ApiProperty } from '@nestjs/swagger';
import { MetaDataItem } from '../../types/MetaDataItem.type';

// subtitle is now @ApiProperty (required), not @ApiPropertyOptional
export class MetaInformationItemDto implements MetaDataItem {
  @ApiProperty({ description: 'Subtitle for this block' })
  subtitle!: string;

  @ApiProperty({ description: 'Description paragraphs', type: [String] })
  description!: string[];
}

export class MetaItemDto {
  @ApiProperty({
    description: 'Key used to link from courseDetails (e.g. rankingMetaData)',
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