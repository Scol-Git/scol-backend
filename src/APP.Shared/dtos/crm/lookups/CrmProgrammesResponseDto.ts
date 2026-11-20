import { ApiProperty } from '@nestjs/swagger';
import { CrmGeoLookupItemDto } from './CrmGeoLookupResponseDto';

export class CrmProgrammesResponseDto {
  @ApiProperty({ type: [CrmGeoLookupItemDto] })
  programmes!: CrmGeoLookupItemDto[];
}
