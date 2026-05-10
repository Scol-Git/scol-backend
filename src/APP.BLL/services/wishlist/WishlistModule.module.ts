import { Module } from '@nestjs/common';
import { WishlistService } from './WishlistService';
import { WishlistMarker } from './WishlistMarker';
import { WishlistMapper } from './WishlistMapper';

/**
 * Wishlist Module (BLL)
 *
 * Provides the LEAD favourite-courses (heart) feature:
 * - `WishlistService` -- atomic add/remove/list with env-driven cap.
 * - `WishlistMarker` -- cache-safe `isWishlisted` enrichment for `/home`.
 * - `WishlistMapper` -- shapes wishlist rows into `WishlistItemDto`.
 *
 * Imported by:
 * - `WishlistsModule` (API) -- to expose the controller.
 * - `SearchModule` (BLL) -- so `HomeSearchService` can inject `WishlistMarker`.
 */
@Module({
  providers: [WishlistService, WishlistMarker, WishlistMapper],
  exports: [WishlistService, WishlistMarker],
})
export class WishlistModule {}
