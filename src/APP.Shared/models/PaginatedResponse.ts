import { ApiProperty } from '@nestjs/swagger';

/**
 * Generic paginated response container.
 * Used to return paginated data with metadata (similar to EF Core's PagedResult).
 *
 * @template T - The type of items in the paginated result
 *
 * @example
 * const result = PaginatedResponse.create(
 *   todos,
 *   totalCount,
 *   1,
 *   10
 * );
 *
 * Returns: { items: [...], pageNumber: 1, pageSize: 10, totalCount: 50, totalPages: 5 }
 */
export class PaginatedResponse<T> {
  /** Array of items for the current page */
  @ApiProperty({ description: 'Array of items for the current page', isArray: true })
  items!: T[];

  /** Current page number (1-based) */
  @ApiProperty({ description: 'Current page number (1-based)', example: 1 })
  pageNumber!: number;

  /** Number of items per page */
  @ApiProperty({ description: 'Number of items per page', example: 10 })
  pageSize!: number;

  /** Total number of items across all pages */
  @ApiProperty({ description: 'Total number of items across all pages', example: 50 })
  totalCount!: number;

  /** Total number of pages */
  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages!: number;

  /**
   * Creates a paginated response instance.
   *
   * @param items - Array of items for the current page
   * @param totalCount - Total number of items across all pages
   * @param pageNumber - Current page number (1-based)
   * @param pageSize - Number of items per page
   * @returns A new PaginatedResponse instance
   */
  static create<T>(
    items: T[],
    totalCount: number,
    pageNumber: number,
    pageSize: number,
  ): PaginatedResponse<T> {
    const response = new PaginatedResponse<T>();
    response.items = items;
    response.pageNumber = pageNumber;
    response.pageSize = pageSize;
    response.totalCount = totalCount;
    response.totalPages = Math.ceil(totalCount / pageSize);
    return response;
  }

  /**
   * Checks if there is a next page.
   */
  get hasNextPage(): boolean {
    return this.pageNumber < this.totalPages;
  }

  /**
   * Checks if there is a previous page.
   */
  get hasPreviousPage(): boolean {
    return this.pageNumber > 1;
  }

  /**
   * Gets the first item number on the current page (1-based).
   */
  get firstItemOnPage(): number {
    return (this.pageNumber - 1) * this.pageSize + 1;
  }

  /**
   * Gets the last item number on the current page (1-based).
   */
  get lastItemOnPage(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalCount);
  }
}
