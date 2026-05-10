import { ApiProperty } from '@nestjs/swagger';

/**
 * **Task:** Be the success body returned by wishlist mutations (`PUT /wishlists`,
 * `DELETE /wishlists/:courseId`): a fixed `success: true` plus a short
 * `message` string that the interceptor promotes to the outer response.
 *
 * **Why:** `ResponseInterceptor` copies a non-empty `message` string onto the
 * envelope and strips it from `data`, so clients receive a single top-level
 * `message` and `data` holds `{ success: true }` only.
 *
 * @example Final HTTP JSON shape
 * ```json
 * {
 *   "status": "success",
 *   "message": "Course added to wishlist successfully",
 *   "statusCode": 200,
 *   "data": { "success": true }
 * }
 * ```
 */
export class WishlistMutationMessageDto {
  @ApiProperty({
    example: true,
    description: 'Always true when the mutation completed without error.',
  })
  success!: boolean;

  @ApiProperty({
    example: 'Course added to wishlist successfully',
    description:
      'Human-readable outcome; duplicated to the wrapped response `message` by `ResponseInterceptor`. ' +
      'DELETE /wishlists/:courseId returns "Course removed from wishlist successfully".',
  })
  message!: string;
}
