import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStageProgressState } from '@shared/enums/ApplicationStageProgressState.enum';

export class ApplicationStageProgressItemDto {
  @ApiProperty({ example: 'REVIEW' })
  stageCode!: string;

  @ApiProperty({ example: 'Review' })
  stageName!: string;

  @ApiProperty({ example: 1 })
  order!: number;

  @ApiProperty({ enum: ApplicationStageProgressState })
  state!: ApplicationStageProgressState;
}
