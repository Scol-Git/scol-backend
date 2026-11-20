import { ApiProperty } from '@nestjs/swagger';
import { PublishCountsDto } from './PublishPreviewResponseDto';

export class PublishResultResponseDto {
  @ApiProperty({ type: PublishCountsDto }) counts!: PublishCountsDto;
  @ApiProperty({ description: 'ISO date-time' }) publishedAt!: string;
}
