import { Injectable } from '@nestjs/common';
import { CourseResultDto } from '@shared/dtos/search/CourseResultDto';
import { WishlistService } from './WishlistService';

/**
 * **Task:** After shared listing/cache work, set `isWishlisted` on each
 * `CourseResultDto` from the current user's wishlist (or leave defaults for
 * guests / no matches).
 *
 * **Why:** Home/search caches are not keyed per user. Mutating cached arrays
 * in place would leak one lead's hearts onto everyone. This layer loads ids
 * via `WishlistService`, then returns the **same** `courses` reference when
 * nothing matches, or a **new** array only when at least one row must flip
 * to `true` — so the cached object is never written to and alloc stays cheap.
 */
@Injectable()
export class WishlistMarker {
  constructor(private readonly wishlistService: WishlistService) {}

  /**
   * @param userId - Authenticated user id, or `undefined` for anonymous.
   * @param courses - Course DTOs from the search/home pipeline.
   * @returns The same `courses` reference if nothing changed, or a fresh
   *          array with the matching items spread to `{ ...dto, isWishlisted: true }`.
   */
  async markCourseDtos(
    userId: string | undefined,
    courses: CourseResultDto[],
  ): Promise<CourseResultDto[]> {
    if (!userId || courses.length === 0) return courses;

    const ids = courses.map((c) => c.courseId);
    const wishlisted = await this.wishlistService.getWishlistedIntakeIds(
      userId,
      ids,
    );
    if (wishlisted.size === 0) return courses;

    return courses.map((c) =>
      wishlisted.has(c.courseId) ? { ...c, isWishlisted: true } : c,
    );
  }
}
