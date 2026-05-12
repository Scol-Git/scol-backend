import { Module } from '@nestjs/common';
import { WishlistController } from './WishlistController.controller';
import { WishlistModule as WishlistBllModule } from '@bll/services/wishlist/WishlistModule.module';

/**
 * Wishlists API Module
 *
 * Exposes wishlist (favourite courses) endpoints; delegates business logic
 * to `WishlistModule` in the BLL layer.
 */
@Module({
  imports: [WishlistBllModule],
  controllers: [WishlistController],
})
export class WishlistsModule {}
