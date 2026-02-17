import { ApiProperty } from '@nestjs/swagger';

/**
 * Single preferred programme item in GET /leads/profile/academic-form response.
 * Full list of all system programmes with selected flag for the lead.
 */
export class PreferredProgrammeItemDto {
  @ApiProperty({ description: 'Programme ID', example: 'uuid-programme' })
  id!: string;

  @ApiProperty({ description: 'Programme name', example: 'Medicine' })
  name!: string;

  @ApiProperty({
    description: 'True when this programme is in the lead’s preferred list',
    example: false,
  })
  selected!: boolean;
}
