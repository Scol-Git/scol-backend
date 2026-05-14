import { ApiProperty } from '@nestjs/swagger';
import { WishlistResponseDto } from './WishlistResponseDto';

/**
 * Response for `GET /wishlists` — the full list of the lead's saved
 * (favourited) course intakes, newest first.
 */
export class WishlistListResponseDto {
  @ApiProperty({ type: [WishlistResponseDto] })
  wishlists!: WishlistResponseDto[];
}
