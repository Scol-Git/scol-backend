import { Module } from '@nestjs/common';
import { WishlistStateService } from './WishlistStateService.service';

/**
 * Provides {@link WishlistStateService} — a shared enricher that stamps
 * `isWishlisted` on course list results. Import wherever a service returns a
 * `SearchResponseDto` (Home, Search, Advanced Search, ...).
 */
@Module({
  providers: [WishlistStateService],
  exports: [WishlistStateService],
})
export class WishlistStateModule {}
