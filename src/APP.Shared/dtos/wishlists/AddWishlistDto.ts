import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsUUID } from 'class-validator';

/**
 * Request payload for adding a wishlist (favourite) entry.
 *
 * `courseId` is semantically the **course intake id** (`UniCourseIntakes.id`),
 * matching how the frontend addresses a course card (one card == one intake).
 */
export class AddWishlistDto {
  @ApiProperty({
    description:
      'Course intake id to add to the lead\'s wishlist (UniCourseIntakes.id).',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsDefined()
  @IsUUID('4')
  @IsNotEmpty()
  courseId!: string;
}
