import { ApiProperty } from '@nestjs/swagger';

/**
 * Selectable item (country, programme) with selection state
 */
export class SelectableItemDto {
  @ApiProperty({ description: 'Item ID', example: 'uuid-canada' })
  id!: string;

  @ApiProperty({ description: 'Item name', example: 'Canada' })
  name!: string;

  @ApiProperty({
    description: 'Whether the user has selected this item',
    example: true,
  })
  selected!: boolean;
}
