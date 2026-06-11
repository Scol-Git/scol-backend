import { ApiProperty } from '@nestjs/swagger';
import { ApplicationActivityType } from '@shared/enums/ApplicationActivityType.enum';
import { CrmApplicationActivityActorDto } from './CrmApplicationActivityActorDto';

export class CrmApplicationActivityItemDto {
  @ApiProperty({ format: 'uuid' })
  activityId!: string;

  @ApiProperty({ enum: ApplicationActivityType })
  activityType!: ApplicationActivityType;

  @ApiProperty({ example: 'Status Updated' })
  title!: string;

  @ApiProperty({
    example: 'Status changed from NEW to CONTACTED.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ example: '2025-11-15T10:30:00.000Z' })
  occurredAt!: string;

  @ApiProperty({ type: CrmApplicationActivityActorDto, nullable: true })
  actor!: CrmApplicationActivityActorDto | null;

  @ApiProperty({ example: 'Lead responded by phone.', nullable: true })
  remarks!: string | null;

  @ApiProperty({
    example: { fileName: 'passport.pdf' },
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  metaData!: Record<string, unknown> | null;
}
