import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, MaxLength } from 'class-validator';
import type { MetaDataItem } from '@shared/types/MetaDataItem.type';

export class MetaDataItemDto implements MetaDataItem {
  @ApiProperty({ example: 'QS 2025' })
  @IsString()
  @MaxLength(255)
  subtitle!: string;

  @ApiProperty({ type: [String], example: ['Ranked 142 globally'] })
  @IsArray()
  @IsString({ each: true })
  description!: string[];
}
