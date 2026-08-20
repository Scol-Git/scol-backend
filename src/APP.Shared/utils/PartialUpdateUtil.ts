/**
 * Applies only defined (non-undefined) fields from a DTO onto an entity.
 * Explicit `null` values are written; omitted keys are skipped.
 *
 * @returns true when at least one field was applied.
 */
export function applyDefinedFields<
  TEntity extends object,
  TDto extends object,
  TKey extends keyof TEntity & keyof TDto,
>(entity: TEntity, dto: TDto, keys: readonly TKey[]): boolean {
  let changed = false;

  for (const key of keys) {
    const value = dto[key];
    if (value === undefined) {
      continue;
    }
    (entity as Record<TKey, unknown>)[key] = value;
    changed = true;
  }

  return changed;
}
