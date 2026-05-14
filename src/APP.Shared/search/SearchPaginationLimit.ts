/** Default page size for course search (must match CourseCursorPaginationService). */
export const SEARCH_DEFAULT_PAGE_LIMIT = 15;

/** Max page size for course search (must match CourseCursorPaginationService). */
export const SEARCH_MAX_PAGE_LIMIT = 50;

/**
 * Normalize requested limit for pagination and cache keys.
 * Same rules as CourseCursorPaginationService.getEffectiveLimit.
 */
export function normalizeSearchPageLimit(limit?: number): number {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed)) {
    return SEARCH_DEFAULT_PAGE_LIMIT;
  }
  const normalized = Math.floor(parsed);
  if (normalized < 1) {
    return SEARCH_DEFAULT_PAGE_LIMIT;
  }
  return Math.min(normalized, SEARCH_MAX_PAGE_LIMIT);
}
