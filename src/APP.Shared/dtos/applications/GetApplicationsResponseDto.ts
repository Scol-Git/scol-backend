import { ApiProperty } from '@nestjs/swagger';
import { ApplicationListItemDto } from './ApplicationListItemDto';

export class GetApplicationsResponseDto {
  @ApiProperty({ type: [ApplicationListItemDto] })
  applications!: ApplicationListItemDto[];
}
