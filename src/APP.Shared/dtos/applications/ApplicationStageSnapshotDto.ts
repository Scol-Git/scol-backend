import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplicationStageSnapshotDto {
  @ApiProperty({ format: 'uuid' })
  stageId!: string;

  @ApiProperty({ example: 'REVIEW' })
  stageCode!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Review' })
  stageName?: string | null;
}
