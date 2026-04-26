import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStageSnapshotDto } from './ApplicationStageSnapshotDto';

export class ChangeCrmApplicationStageResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: ApplicationStageSnapshotDto })
  currentStage!: ApplicationStageSnapshotDto;

  @ApiProperty({ type: ApplicationStageSnapshotDto })
  previousStage!: ApplicationStageSnapshotDto;
}
