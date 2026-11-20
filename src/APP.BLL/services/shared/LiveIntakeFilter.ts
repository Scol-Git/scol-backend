import { IsNull, type FindOptionsWhere, type SelectQueryBuilder } from 'typeorm';
import type { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';

/** An intake a Lead may see: active, published, not deleted. */
export const LIVE_INTAKE_WHERE: FindOptionsWhere<UniCourseIntakes> = {
  isActive: true,
  isPublished: true,
  deletedAt: IsNull(),
};

/** Adds the live-intake condition to a query builder for the given intake alias. */
export function applyLiveIntakeFilter<T extends object>(
  qb: SelectQueryBuilder<T>,
  alias: string,
): SelectQueryBuilder<T> {
  return qb
    .andWhere(`${alias}.isActive = true`)
    .andWhere(`${alias}.isPublished = true`)
    .andWhere(`${alias}.deletedAt IS NULL`);
}
