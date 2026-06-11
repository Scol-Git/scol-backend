import { ApiProperty } from '@nestjs/swagger';
import { CrmApplicationActivityItemDto } from './CrmApplicationActivityItemDto';

export class GetCrmApplicationActivitiesResponseDto {
  @ApiProperty({ format: 'uuid' })
  applicationId!: string;

  @ApiProperty({ type: [CrmApplicationActivityItemDto] })
  activities!: CrmApplicationActivityItemDto[];
}
