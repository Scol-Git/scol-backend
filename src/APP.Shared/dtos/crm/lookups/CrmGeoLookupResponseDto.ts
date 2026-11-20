import { ApiProperty } from '@nestjs/swagger';

export class CrmGeoLookupItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'United Kingdom' })
  name!: string;

  @ApiProperty()
  isPublished!: boolean;
}

export class CrmCountriesResponseDto {
  @ApiProperty({ type: [CrmGeoLookupItemDto] })
  countries!: CrmGeoLookupItemDto[];
}

export class CrmStatesResponseDto {
  @ApiProperty({ type: [CrmGeoLookupItemDto] })
  states!: CrmGeoLookupItemDto[];
}

export class CrmCitiesResponseDto {
  @ApiProperty({ type: [CrmGeoLookupItemDto] })
  cities!: CrmGeoLookupItemDto[];
}
