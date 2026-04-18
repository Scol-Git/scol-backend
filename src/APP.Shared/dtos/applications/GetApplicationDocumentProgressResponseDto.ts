import { ApiProperty } from '@nestjs/swagger';
import { ApplicationDocumentProgressItemDto } from './ApplicationDocumentProgressItemDto';

export class GetApplicationDocumentProgressResponseDto {
  @ApiProperty({ example: 7 })
  totalRequired!: number;

  @ApiProperty({ example: 3 })
  uploadedCount!: number;

  @ApiProperty({ type: [ApplicationDocumentProgressItemDto] })
  progressBarItems!: ApplicationDocumentProgressItemDto[];
}
