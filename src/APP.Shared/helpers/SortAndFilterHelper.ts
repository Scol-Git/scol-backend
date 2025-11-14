import { SelectQueryBuilder } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { Filter } from '@shared/models/Filter';

/**
 * Static helper class for applying dynamic sorting and filtering to TypeORM queries.
 * Provides SQL injection protection and standardized query building.
 *
 * Similar to EF Core's dynamic LINQ expressions.
 *
 * @example
 * const query = dataSource
 *   .getRepository(Todo)
 *   .createQueryBuilder('todo');
 *
 * SortAndFilterHelper.validateAndApplyFilters(query, filters);
 * SortAndFilterHelper.validateAndApplySorting(query, ['createdAt', 'title'], ['DESC', 'ASC']);
 */
export class SortAndFilterHelper {
  /**
   * Validates and applies filters to a query builder.
   *
   * @param qb - TypeORM SelectQueryBuilder instance
   * @param filters - Array of filter conditions
   * @returns The modified query builder
   *
   * @throws BadRequestException if filter validation fails
   */
  static validateAndApplyFilters<T extends object>(
    qb: SelectQueryBuilder<T>,
    filters: Filter[],
  ): SelectQueryBuilder<T> {
    if (!filters || filters.length === 0) {
      return qb;
    }

    filters.forEach((filter) => {
      this.validatePropertyName(filter.propertyName);
      qb = this.applyFilter(qb, filter);
    });

    return qb;
  }

  /**
   * Validates and applies sorting to a query builder.
   *
   * @param qb - TypeORM SelectQueryBuilder instance
   * @param sortColumns - Array of column names to sort by
   * @param sortDirections - Array of sort directions ('ASC' or 'DESC')
   * @returns The modified query builder
   *
   * @throws BadRequestException if sort column validation fails
   */
  static validateAndApplySorting<T extends object>(
    qb: SelectQueryBuilder<T>,
    sortColumns: string[],
    sortDirections: string[],
  ): SelectQueryBuilder<T> {
    if (!sortColumns || sortColumns.length === 0) {
      return qb;
    }

    const alias = qb.expressionMap.mainAlias?.name || 'entity';

    sortColumns.forEach((column, index) => {
      this.validatePropertyName(column);
      const direction =
        sortDirections[index]?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const columnName = `${alias}.${column}`;

      if (index === 0) {
        qb = qb.orderBy(columnName, direction);
      } else {
        qb = qb.addOrderBy(columnName, direction);
      }
    });

    return qb;
  }

  /**
   * Applies a single filter condition to a query builder.
   *
   * @param qb - TypeORM SelectQueryBuilder instance
   * @param filter - Filter condition to apply
   * @returns The modified query builder
   *
   * @throws BadRequestException if filter operator is unknown or invalid
   */
  private static applyFilter<T extends object>(
    qb: SelectQueryBuilder<T>,
    filter: Filter,
  ): SelectQueryBuilder<T> {
    const alias = qb.expressionMap.mainAlias?.name || 'entity';
    const paramName = `filter_${filter.propertyName}_${Math.random().toString(36).substring(7)}`;
    const columnName = `${alias}.${filter.propertyName}`;

    switch (filter.operator) {
      case 'eq':
        return qb.andWhere(`${columnName} = :${paramName}`, {
          [paramName]: filter.value,
        });

      case 'ne':
        return qb.andWhere(`${columnName} != :${paramName}`, {
          [paramName]: filter.value,
        });

      case 'contains':
        return qb.andWhere(`${columnName} ILIKE :${paramName}`, {
          [paramName]: `%${filter.value}%`,
        });

      case 'startsWith':
        return qb.andWhere(`${columnName} ILIKE :${paramName}`, {
          [paramName]: `${filter.value}%`,
        });

      case 'endsWith':
        return qb.andWhere(`${columnName} ILIKE :${paramName}`, {
          [paramName]: `%${filter.value}`,
        });

      case 'gt':
        return qb.andWhere(`${columnName} > :${paramName}`, {
          [paramName]: filter.value,
        });

      case 'gte':
        return qb.andWhere(`${columnName} >= :${paramName}`, {
          [paramName]: filter.value,
        });

      case 'lt':
        return qb.andWhere(`${columnName} < :${paramName}`, {
          [paramName]: filter.value,
        });

      case 'lte':
        return qb.andWhere(`${columnName} <= :${paramName}`, {
          [paramName]: filter.value,
        });

      case 'in':
        if (!Array.isArray(filter.value)) {
          throw new BadRequestException(
            `Filter operator 'in' requires an array value`,
          );
        }
        return qb.andWhere(`${columnName} IN (:...${paramName})`, {
          [paramName]: filter.value,
        });

      case 'notIn':
        if (!Array.isArray(filter.value)) {
          throw new BadRequestException(
            `Filter operator 'notIn' requires an array value`,
          );
        }
        return qb.andWhere(`${columnName} NOT IN (:...${paramName})`, {
          [paramName]: filter.value,
        });

      case 'isNull':
        return qb.andWhere(`${columnName} IS NULL`);

      case 'isNotNull':
        return qb.andWhere(`${columnName} IS NOT NULL`);

      default:
        throw new BadRequestException(
          `Unknown filter operator: ${filter.operator}`,
        );
    }
  }

  /**
   * Validates a property name to prevent SQL injection.
   *
   * @param propertyName - Property name to validate
   *
   * @throws BadRequestException if property name contains invalid characters
   */
  private static validatePropertyName(propertyName: string): void {
    // Only allow alphanumeric characters and underscores, must start with letter or underscore
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(propertyName)) {
      throw new BadRequestException(
        `Invalid property name: ${propertyName}. Property names must start with a letter or underscore and contain only alphanumeric characters and underscores.`,
      );
    }

    // Prevent common SQL keywords (case-insensitive)
    const sqlKeywords = [
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'DROP',
      'CREATE',
      'ALTER',
      'EXEC',
      'EXECUTE',
      'UNION',
      'OR',
      'AND',
    ];

    if (sqlKeywords.includes(propertyName.toUpperCase())) {
      throw new BadRequestException(
        `Property name '${propertyName}' is not allowed (SQL keyword)`,
      );
    }
  }
}
