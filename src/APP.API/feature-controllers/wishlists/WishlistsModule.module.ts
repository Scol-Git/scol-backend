import { Module } from '@nestjs/common';
import { WishlistsController } from './WishlistsController.controller';
import { WishlistModule as WishlistBllModule } from '@bll/services/wishlist/WishlistModule.module';

/**
 * Wishlists Module (API)
 *
 * Exposes the LEAD favourite-courses (heart) endpoints under `/wishlists`.
 * Imports the BLL `WishlistModule` for the underlying service.
 */
@Module({
  imports: [WishlistBllModule],
  controllers: [WishlistsController],
})
export class WishlistsModule {}
