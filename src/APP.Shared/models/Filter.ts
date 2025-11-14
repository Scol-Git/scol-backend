import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Represents a filter condition for dynamic querying.
 * Used with QueryBuilder extension methods for flexible filtering.
 *
 * @example
 * const filters: Filter[] = [
 *   { propertyName: 'status', operator: 'eq', value: 'ACTIVE' },
 *   { propertyName: 'title', operator: 'contains', value: 'test' },
 *   { propertyName: 'priority', operator: 'in', value: ['HIGH', 'MEDIUM'] }
 * ];
 */
export class Filter {
  /** Name of the property/column to filter on */
  @ApiProperty({
    description: 'Name of the property to filter on',
    example: 'name',
  })
  @IsString()
  @IsNotEmpty()
  propertyName!: string;

  /** Filter operator */
  @ApiProperty({
    description: 'Operator to use for filtering',
    enum: [
      'eq',
      'ne',
      'gt',
      'gte',
      'lt',
      'lte',
      'contains',
      'startsWith',
      'endsWith',
      'in',
      'notIn',
      'isNull',
      'isNotNull',
    ],
    example: 'contains',
  })
  @IsString()
  @IsIn([
    'eq',
    'ne',
    'gt',
    'gte',
    'lt',
    'lte',
    'contains',
    'startsWith',
    'endsWith',
    'in',
    'notIn',
    'isNull',
    'isNotNull',
  ])
  operator!: FilterOperator;

  /** Value to filter by (type depends on operator) */
  @ApiPropertyOptional({
    description: 'Value to filter by (optional for isNull/isNotNull)',
    example: 'Acme Corp',
  })
  @IsOptional()
  value?: any;
}

/**
 * Supported filter operators for dynamic filtering.
 * Matches common database query operators.
 */
export type FilterOperator =
  | 'eq' // Equal (=)
  | 'ne' // Not equal (!=)
  | 'gt' // Greater than (>)
  | 'gte' // Greater than or equal (>=)
  | 'lt' // Less than (<)
  | 'lte' // Less than or equal (<=)
  | 'contains' // String contains (ILIKE %value%)
  | 'startsWith' // String starts with (ILIKE value%)
  | 'endsWith' // String ends with (ILIKE %value)
  | 'in' // In array (IN)
  | 'notIn' // Not in array (NOT IN)
  | 'isNull' // Is null (IS NULL)
  | 'isNotNull'; // Is not null (IS NOT NULL)
