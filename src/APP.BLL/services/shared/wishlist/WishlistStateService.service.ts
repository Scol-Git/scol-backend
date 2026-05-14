import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';

import { AppDbContext } from '@infra/db/typeorm/AppDbContext';

import { ICurrentUser } from '@shared/interfaces/domain';
import { SearchResponseDto } from '@shared/dtos/search/SearchResponseDto';

/**
 * Wishlist State Service (shared)
 *
 * Stamps `isWishlisted` on every `CourseResultDto` in a `SearchResponseDto`
 * page for the current lead.
 *
 * Used by every list endpoint that returns courses (home, search,
 * advanced search) so the UI heart-button has accurate per-card state without
 * each caller re-implementing the lookup.
 *
 * Cost per page: one `findOne` on `leadProfiles` (`id` only) + one `find` on
 * `leadFavouriteCourses` with `leadId = ? AND courseIntakeId IN (page ids)`
 * (`courseIntakeId` only). Both projections use `select` to minimise wire
 * traffic; the `UQ_LeadFavouriteCourses_lead_intake` unique index serves the
 * second query.
 *
 * No-ops (returns silently) when:
 *  - the caller is anonymous (`user?.userId` missing),
 *  - the page has no courses, or
 *  - the user has no lead profile yet.
 */
@Injectable()
export class WishlistStateService {
  constructor(private readonly dbContext: AppDbContext) {}

  async attachWishlistState(
    user: ICurrentUser | undefined,
    result: SearchResponseDto,
  ): Promise<void> {
    if (!user?.userId) {
      return;
    }

    if (!result.courses?.length) {
      return;
    }

    const leadProfile = await this.dbContext.leadProfiles.findOne({
      where: { userId: user.userId },
      select: { id: true },
    });

    if (!leadProfile) {
      return;
    }

    const intakeIds = result.courses.map((x) => x.courseId);

    const wishlistRows = await this.dbContext.leadFavouriteCourses.find({
      where: {
        leadId: leadProfile.id,
        courseIntakeId: In(intakeIds),
      },
      select: { courseIntakeId: true },
    });

    if (wishlistRows.length === 0) {
      return;
    }

    const wishlistSet = new Set(wishlistRows.map((x) => x.courseIntakeId));

    result.courses = result.courses.map((course) => ({
      ...course,
      isWishlisted: wishlistSet.has(course.courseId),
    }));
  }
}
