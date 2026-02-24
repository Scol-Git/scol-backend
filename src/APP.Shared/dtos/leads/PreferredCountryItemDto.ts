import { ApiProperty } from '@nestjs/swagger';

/**
 * Single preferred country item in GET /leads/profile/academic-form response.
 * Full list of all system countries with selected flag for the lead.
 */
export class PreferredCountryItemDto {
  @ApiProperty({ description: 'Country ID', example: 'uuid-country' })
  id!: string;

  @ApiProperty({ description: 'Country name', example: 'Australia' })
  name!: string;

  @ApiProperty({
    description: 'True when this country is in the lead’s preferred list',
    example: false,
  })
  selected!: boolean;
}
