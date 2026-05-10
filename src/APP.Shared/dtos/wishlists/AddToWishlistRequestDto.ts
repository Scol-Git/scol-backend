import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * **Task:** Validate the JSON body for `PUT /wishlists`.
 *
 * **Why:** The path does not carry the intake id; the client sends the
 * `UniCourseIntakes` primary key explicitly. That value is the same id exposed
 * elsewhere as `courseId` (home, search, wishlist list, delete path param).
 */
export class AddToWishlistRequestDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'Primary key of `UniCourseIntakes` — identical to `courseId` in listing APIs.',
    example: '7c1c61ef-16f5-454a-ba0a-c30053d84a18',
  })
  @IsUUID('4')
  courseIntakeId!: string;
}
