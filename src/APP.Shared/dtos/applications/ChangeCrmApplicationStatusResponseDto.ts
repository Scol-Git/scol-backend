import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatusSnapshotDto } from './ApplicationStatusSnapshotDto';

export class ChangeCrmApplicationStatusResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: ApplicationStatusSnapshotDto })
  currentStatus!: ApplicationStatusSnapshotDto;

  @ApiProperty({ type: ApplicationStatusSnapshotDto })
  previousStatus!: ApplicationStatusSnapshotDto;
}
