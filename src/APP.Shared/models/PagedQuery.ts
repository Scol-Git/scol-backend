import { BadRequestException } from '@nestjs/common';
import { Filter } from './Filter';

/**
 * Generic paged query parameters.
 * Used for requesting paginated, filtered, and sorted data (similar to EF Core's PagedRequest).
 *
 * @template T - The entity type being queried
 *
 * @example
 * const query = new PagedQuery<Todo>();
 * query.pageNumber = 1;
 * query.pageSize = 10;
 * query.sortColumns = 'createdAt,title';
 * query.sortDirections = 'desc,asc';
 * query.filters = [{ propertyName: 'status', operator: 'eq', value: 'ACTIVE' }];
 */
export class PagedQuery<T> {
  /** Current page number (1-based, default: 1) */
  pageNumber: number = 1;

  /** Number of items per page (default: 100, max: 1000) */
  pageSize: number = 100;

  /** Comma-separated list of columns to sort by (default: 'updatedAt') */
  sortColumns: string = 'updatedAt';

  /** Comma-separated list of sort directions: 'asc' or 'desc' (default: 'desc') */
  sortDirections: string = 'desc';

  /** Array of filter conditions */
  filters: Filter[] = [];

  /** Optional organization selection filter (for super admin users) */
  orgSelectionFilter?: OrganizationSelectionFilter;

  /**
   * Validates pagination parameters.
   * Throws BadRequestException if parameters are invalid.
   */
  validatePaginationParameters(): void {
    if (this.pageNumber < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (this.pageSize < 1) {
      throw new BadRequestException('Page size must be greater than 0');
    }

    if (this.pageSize > 1000) {
      throw new BadRequestException('Page size cannot exceed 1000');
    }

    // Validate sort columns format
    if (
      this.sortColumns &&
      !/^[a-zA-Z_][a-zA-Z0-9_,]*$/.test(this.sortColumns)
    ) {
      throw new BadRequestException('Invalid sort columns format');
    }

    // Validate sort directions format
    if (
      this.sortDirections &&
      !/^(asc|desc)(,(asc|desc))*$/i.test(this.sortDirections)
    ) {
      throw new BadRequestException(
        'Invalid sort directions format (must be comma-separated asc/desc)',
      );
    }
  }

  /**
   * Gets an array of sort column names.
   */
  getSortColumns(): string[] {
    return this.sortColumns ? this.sortColumns.split(',') : [];
  }

  /**
   * Gets an array of sort directions.
   */
  getSortDirections(): string[] {
    return this.sortDirections ? this.sortDirections.split(',') : [];
  }

  /**
   * Calculates the skip value for pagination.
   */
  getSkip(): number {
    return (this.pageNumber - 1) * this.pageSize;
  }

  /**
   * Gets the take value for pagination.
   */
  getTake(): number {
    return this.pageSize;
  }
}

/**
 * Organization selection filter for super admin users.
 * Allows filtering across multiple organizations.
 */
export interface OrganizationSelectionFilter {
  /** Array of organization IDs to include */
  organizationIds: string[];

  /** Whether to include child organizations */
  includeChildOrganizations?: boolean;
}
