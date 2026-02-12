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
    return this.encodeCursorFromValues(
      rankedCourse.rankScore,
      rankedCourse.courseIntake.id,
    );
  }

  /**
   * Encode cursor from rankScore and courseIntakeId (e.g. when building from DB row)
   */
  encodeCursorFromValues(rankScore: number, courseIntakeId: string): string {
    const data: CursorData = { rankScore, courseIntakeId };
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
   * Build paginated result from an already-paginated list (e.g. from DB with LIMIT+1).
   * No array slicing for cursor position; caller supplies exactly the page (or page+1 for hasNext).
   *
   * @param rankedCourses - Page of ranked courses (length = limit or limit+1)
   * @param requestedLimit - Requested page size (will be clamped to getEffectiveLimit)
   * @returns Paginated result with items trimmed to limit, nextCursor and hasNext
   */
  buildPaginatedResult(
    rankedCourses: RankedCourse[],
    requestedLimit?: number,
  ): PaginatedResult<RankedCourse> {
    const effectiveLimit = this.getEffectiveLimit(requestedLimit);
    const items = rankedCourses.slice(0, effectiveLimit);
    const hasNext = rankedCourses.length > effectiveLimit;
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
