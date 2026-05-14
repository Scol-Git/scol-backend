import { ApiProperty } from '@nestjs/swagger';

/**
 * Generic mutation result for wishlist add / remove endpoints.
 */
export class WishlistActionResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;
}
