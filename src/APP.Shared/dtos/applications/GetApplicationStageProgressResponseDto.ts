import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStageProgressItemDto } from './ApplicationStageProgressItemDto';

export class ApplicationStageProgressCurrentStageDto {
  @ApiProperty({ example: 'SUBMITTED' })
  stageCode!: string;

  @ApiProperty({ example: 'Submitted' })
  stageName!: string;
}

export class GetApplicationStageProgressResponseDto {
  @ApiProperty({ example: 10 })
  totalStages!: number;

  @ApiProperty({ example: 2 })
  completedStages!: number;

  @ApiProperty({ type: ApplicationStageProgressCurrentStageDto })
  currentStage!: ApplicationStageProgressCurrentStageDto;

  @ApiProperty({ type: [ApplicationStageProgressItemDto] })
  progressBarItems!: ApplicationStageProgressItemDto[];
}
