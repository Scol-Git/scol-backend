import { OmitType } from '@nestjs/swagger';
import { CourseResultDto } from '@shared/dtos/search/CourseResultDto';

/**
 * **Task:** Describe one row returned inside `GET /wishlists`.
 *
 * **Why:** Clients should render wishlist cards with the same fields as home
 * and search. `isWishlisted` is omitted because every row is wishlisted by
 * definition, so the flag would always be true and would only add noise.
 */
export class WishlistItemDto extends OmitType(CourseResultDto, [
  'isWishlisted',
] as const) {}
