import { Module } from '@nestjs/common';
import { WishlistService } from './WishlistService';

/**
 * Wishlist Module (BLL)
 *
 * Provides the WishlistService (favourite courses CRUD + listing).
 * Consumed by `WishlistsModule` in the API layer.
 */
@Module({
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
