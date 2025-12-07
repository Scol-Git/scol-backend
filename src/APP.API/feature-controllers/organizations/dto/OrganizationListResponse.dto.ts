import { ApiProperty } from '@nestjs/swagger';
import { OrganizationDto } from './Organization.dto';

export class OrganizationListResponseDto {
  @ApiProperty({ type: [OrganizationDto] })
  items!: OrganizationDto[];
}

