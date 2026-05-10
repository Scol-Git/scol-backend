import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Inactive Course Intake Exception
 *
 * Thrown when a wishlist mutation targets a course intake that is inactive
 * or soft-deleted.
 *
 * Returns 400 Bad Request.
 */
export class InactiveCourseIntakeException extends HttpException {
  constructor() {
    super(
      {
        message: 'This course is no longer available',
        error: { code: 'INACTIVE_COURSE_INTAKE' },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
