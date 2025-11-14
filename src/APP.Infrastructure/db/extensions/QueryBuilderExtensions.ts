import { SelectQueryBuilder, Brackets } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ICurrentUser } from '@shared/interfaces/ICurrentUser.interface';
import { IHaveOrganization } from '@shared/interfaces/IHaveOrganization.interface';
import { VisibilityLevel } from '@shared/enums/VisibilityLevel.enum';
import { PagedQuery } from '@shared/models/PagedQuery';
import { Filter } from '@shared/models/Filter';

/**
 * TypeORM QueryBuilder Extension Methods
 *
 * These extensions mimic EF Core's IQueryable<T> extension methods,
 * providing a fluent API for building complex queries with multi-tenancy,
 * pagination, filtering, and sorting support.
 *
 * @example
 * const query = dataSource
 *   .getRepository(Todo)
 *   .createQueryBuilder('todo')
 *   .withOrganizationFilter(user)
 *   .applyPagination(pagedQuery)
 *   .applyDynamicFilters(pagedQuery.filters)
 *   .applyDynamicSorting(['createdAt'], ['DESC']);
 */
declare module 'typeorm' {
  interface SelectQueryBuilder<Entity> {
    /**
     * Applies organization-based filtering for multi-tenant entities.
     * Filters entities based on user's organization and visibility level.
     * Super admins bypass all filters.
     */
    withOrganizationFilter(user: ICurrentUser): this;

    /**
     * Applies pagination (skip/take) to the query.
     */
    applyPagination<T>(pagedQuery: PagedQuery<T>): this;

    /**
     * Applies dynamic filters based on Filter array.
     */
    applyDynamicFilters(filters: Filter[]): this;

    /**
     * Applies dynamic sorting based on column names and directions.
     */
    applyDynamicSorting(sortColumns: string[], sortDirections: string[]): this;
  }
}

/**
 * Applies organization-based filtering for multi-tenant entities.
 *
 * @param user - Current authenticated user
 * @returns The query builder instance for chaining
 *
 * @example
 * const todos = await dataSource
 *   .getRepository(Todo)
 *   .createQueryBuilder('todo')
 *   .withOrganizationFilter(user)
 *   .getMany();
 */
SelectQueryBuilder.prototype.withOrganizationFilter = function <
  T extends IHaveOrganization,
>(this: SelectQueryBuilder<T>, user: ICurrentUser): SelectQueryBuilder<T> {
  // Super admins bypass organization filtering
  if (user.isSuperAdmin) {
    return this;
  }

  const alias = this.expressionMap.mainAlias?.name || 'entity';

  return this.andWhere(
    new Brackets((qb) => {
      qb.where(`${alias}.visibilityLevel = :public`, {
        public: VisibilityLevel.Public,
      })
        .orWhere(`${alias}.orgId = :orgId`, { orgId: user.orgId })
        .orWhere(`${alias}.orgId IN (:...allowedOrgs)`, {
          allowedOrgs: user.allowedOrganizationsId || [],
        });
    }),
  );
};

/**
 * Applies pagination (skip/take) to the query.
 *
 * @param pagedQuery - Pagination parameters
 * @returns The query builder instance for chaining
 *
 * @example
 * const query = dataSource
 *   .getRepository(Todo)
 *   .createQueryBuilder('todo')
 *   .applyPagination(pagedQuery);
 */
SelectQueryBuilder.prototype.applyPagination = function <T extends object>(
  this: SelectQueryBuilder<T>,
  pagedQuery: PagedQuery<any>,
): SelectQueryBuilder<T> {
  const skip = (pagedQuery.pageNumber - 1) * pagedQuery.pageSize;
  return this.skip(skip).take(pagedQuery.pageSize);
};

/**
 * Applies dynamic filters based on Filter array.
 *
 * @param filters - Array of filter conditions
 * @returns The query builder instance for chaining
 *
 * @example
 * const filters = [
 *   { propertyName: 'status', operator: 'eq', value: 'ACTIVE' },
 *   { propertyName: 'title', operator: 'contains', value: 'test' }
 * ];
 * const query = dataSource
 *   .getRepository(Todo)
 *   .createQueryBuilder('todo')
 *   .applyDynamicFilters(filters);
 */
SelectQueryBuilder.prototype.applyDynamicFilters = function <T extends object>(
  this: SelectQueryBuilder<T>,
  filters: Filter[],
): SelectQueryBuilder<T> {
  if (!filters || filters.length === 0) {
    return this;
  }

  const alias = this.expressionMap.mainAlias?.name || 'entity';

  filters.forEach((filter) => {
    // Validate property name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(filter.propertyName)) {
      throw new BadRequestException(
        `Invalid property name: ${filter.propertyName}`,
      );
    }

    const paramName = `filter_${filter.propertyName}_${Math.random().toString(36).substring(7)}`;
    const columnName = `${alias}.${filter.propertyName}`;

    switch (filter.operator) {
      case 'eq':
        this.andWhere(`${columnName} = :${paramName}`, {
          [paramName]: filter.value,
        });
        break;

      case 'ne':
        this.andWhere(`${columnName} != :${paramName}`, {
          [paramName]: filter.value,
        });
        break;

      case 'contains':
        this.andWhere(`${columnName} ILIKE :${paramName}`, {
          [paramName]: `%${filter.value}%`,
        });
        break;

      case 'startsWith':
        this.andWhere(`${columnName} ILIKE :${paramName}`, {
          [paramName]: `${filter.value}%`,
        });
        break;

      case 'endsWith':
        this.andWhere(`${columnName} ILIKE :${paramName}`, {
          [paramName]: `%${filter.value}`,
        });
        break;

      case 'gt':
        this.andWhere(`${columnName} > :${paramName}`, {
          [paramName]: filter.value,
        });
        break;

      case 'gte':
        this.andWhere(`${columnName} >= :${paramName}`, {
          [paramName]: filter.value,
        });
        break;

      case 'lt':
        this.andWhere(`${columnName} < :${paramName}`, {
          [paramName]: filter.value,
        });
        break;

      case 'lte':
        this.andWhere(`${columnName} <= :${paramName}`, {
          [paramName]: filter.value,
        });
        break;

      case 'in':
        if (Array.isArray(filter.value)) {
          this.andWhere(`${columnName} IN (:...${paramName})`, {
            [paramName]: filter.value,
          });
        } else {
          throw new BadRequestException(
            `Filter operator 'in' requires an array value`,
          );
        }
        break;

      case 'notIn':
        if (Array.isArray(filter.value)) {
          this.andWhere(`${columnName} NOT IN (:...${paramName})`, {
            [paramName]: filter.value,
          });
        } else {
          throw new BadRequestException(
            `Filter operator 'notIn' requires an array value`,
          );
        }
        break;

      case 'isNull':
        this.andWhere(`${columnName} IS NULL`);
        break;

      case 'isNotNull':
        this.andWhere(`${columnName} IS NOT NULL`);
        break;

      default:
        throw new BadRequestException(
          `Unknown filter operator: ${filter.operator}`,
        );
    }
  });

  return this;
};

/**
 * Applies dynamic sorting based on column names and directions.
 *
 * @param sortColumns - Array of column names to sort by
 * @param sortDirections - Array of sort directions ('ASC' or 'DESC')
 * @returns The query builder instance for chaining
 *
 * @example
 * const query = dataSource
 *   .getRepository(Todo)
 *   .createQueryBuilder('todo')
 *   .applyDynamicSorting(['createdAt', 'title'], ['DESC', 'ASC']);
 */
SelectQueryBuilder.prototype.applyDynamicSorting = function <T extends object>(
  this: SelectQueryBuilder<T>,
  sortColumns: string[],
  sortDirections: string[],
): SelectQueryBuilder<T> {
  if (!sortColumns || sortColumns.length === 0) {
    return this;
  }

  const alias = this.expressionMap.mainAlias?.name || 'entity';

  sortColumns.forEach((column, index) => {
    // Validate property name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
      throw new BadRequestException(`Invalid property name: ${column}`);
    }

    const direction =
      sortDirections[index]?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const columnName = `${alias}.${column}`;

    if (index === 0) {
      this.orderBy(columnName, direction);
    } else {
      this.addOrderBy(columnName, direction);
    }
  });

  return this;
};
