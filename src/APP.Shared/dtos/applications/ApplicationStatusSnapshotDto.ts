import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplicationStatusSnapshotDto {
  @ApiProperty({ format: 'uuid' })
  statusId!: string;

  @ApiProperty({ example: 'IN_PROGRESS' })
  statusCode!: string;

  @ApiPropertyOptional({ nullable: true, example: 'In Progress' })
  statusName?: string | null;
}
