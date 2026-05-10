import { ApiProperty } from '@nestjs/swagger';
import { WishlistItemDto } from './WishlistItemDto';

/**
 * **Task:** Shape the `data` object for `GET /wishlists`.
 *
 * **Why:** The UI needs a stable array of course cards. Rows whose intake is
 * inactive or soft-deleted are dropped server-side so the client never shows
 * empty “ghost” cards. Items are ordered newest favourite first
 * (`createdAt DESC`, then `id DESC`).
 */
export class WishlistsResponseDto {
  @ApiProperty({
    type: [WishlistItemDto],
    description:
      'Wishlisted course intakes for the authenticated lead (newest first).',
  })
  wishlists!: WishlistItemDto[];
}
