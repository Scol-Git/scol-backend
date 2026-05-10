import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Wishlist Limit Reached Exception
 *
 * Thrown when a `LEAD` user is already at the configured per-user wishlist
 * cap (env `WISHLIST_PER_USER_LIMIT`, default 5) and tries to add a NEW
 * intake. Re-adding an already-wishlisted intake never trips the cap
 * (idempotent), so this only fires on genuinely new entries.
 *
 * Returns 409 Conflict.
 */
export class WishlistLimitReachedException extends HttpException {
  constructor(limit: number) {
    super(
      {
        message: `You can wishlist up to ${limit} courses`,
        error: { code: 'WISHLIST_LIMIT_REACHED' },
      },
      HttpStatus.CONFLICT,
    );
  }
}
