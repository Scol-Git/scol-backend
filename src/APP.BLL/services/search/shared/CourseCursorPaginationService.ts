import { Injectable } from '@nestjs/common';
import {
  RankedCourse,
  CursorData,
  PaginatedResult,
} from '@shared/search/SearchTypes';

/**
 * Handles cursor-based pagination for course search
 *
 * Cursor encodes: rankScore + courseIntakeId
 * This ensures deterministic pagination even with same scores.
 */
@Injectable()
export class CourseCursorPaginationService {
  private readonly DEFAULT_LIMIT = 15;
  private readonly MAX_LIMIT = 50;

  /**
   * Encode cursor from ranked course
   */
  encodeCursor(rankedCourse: RankedCourse): string {
    const data: CursorData = {
      rankScore: rankedCourse.rankScore,
      courseIntakeId: rankedCourse.courseIntake.id,
    };
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  /**
   * Decode cursor to data
   */
  decodeCursor(cursor: string): CursorData | null {
    try {
      const json = Buffer.from(cursor, 'base64url').toString('utf-8');
      return JSON.parse(json) as CursorData;
    } catch {
      return null;
    }
  }

  /**
   * Apply cursor pagination to ranked results
   * @param rankedCourses - All ranked courses
   * @param cursor - Cursor from previous page (optional)
   * @param limit - Number of items per page
   * @returns Paginated result with next cursor
   */
  applyPagination(
    rankedCourses: RankedCourse[],
    cursor?: string,
    limit?: number,
  ): PaginatedResult<RankedCourse> {
    const effectiveLimit = Math.min(
      limit ?? this.DEFAULT_LIMIT,
      this.MAX_LIMIT,
    );

    let startIndex = 0;

    if (cursor) {
      const cursorData = this.decodeCursor(cursor);
      if (cursorData) {
        // Find the position after the cursor
        // Courses are sorted by rankScore DESC, then by id ASC
        startIndex = rankedCourses.findIndex((rc) => {
          // Lower rank score = after cursor
          if (rc.rankScore < cursorData.rankScore) {
            return true;
          }
          // Same rank score: higher ID = after cursor
          if (rc.rankScore === cursorData.rankScore) {
            return rc.courseIntake.id > cursorData.courseIntakeId;
          }
          return false;
        });

        // If cursor not found, start from end (no more results)
        if (startIndex === -1) {
          startIndex = rankedCourses.length;
        }
      }
    }

    // Get items for this page
    const items = rankedCourses.slice(startIndex, startIndex + effectiveLimit);
    const hasNext = startIndex + effectiveLimit < rankedCourses.length;

    // Generate next cursor if there are more results
    const nextCursor =
      items.length > 0 && hasNext
        ? this.encodeCursor(items[items.length - 1])
        : null;

    return {
      items,
      cursor: nextCursor,
      hasNext,
      limit: effectiveLimit,
    };
  }

  /**
   * Get effective limit (with bounds)
   */
  getEffectiveLimit(limit?: number): number {
    return Math.min(limit ?? this.DEFAULT_LIMIT, this.MAX_LIMIT);
  }
}
