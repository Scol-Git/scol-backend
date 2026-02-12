import { ApiProperty } from '@nestjs/swagger';

/**
 * City option (id, name pair)
 */
export class CityDto {
  @ApiProperty({
    description: 'City ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'City name',
    example: 'New York',
  })
  name!: string;
}

/**
 * Response for GET /categories/cities
 */
export class CitiesResponseDto {
  @ApiProperty({
    description: 'Available cities',
    type: [CityDto],
  })
  cities!: CityDto[];
}
