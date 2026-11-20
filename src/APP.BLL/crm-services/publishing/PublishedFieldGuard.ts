import { ValidationException } from '@shared/exceptions/ValidationException';
import { PUBLISH_COLUMNS, type ReadinessEntity } from './PublishReadinessChecker';

/**
 * Edit invariant: on a PUBLISHED row, a field that is `required: 'publish'` in the import
 * schema can't be cleared. Pure (no DB): only inspects the fields present in the PATCH body.
 */
export function assertPublishFieldsNotCleared(
  entity: ReadinessEntity,
  isPublished: boolean,
  dto: object,
): void {
  if (!isPublished) return;
  const body = dto as Record<string, unknown>;
  const errors: Record<string, string[]> = {};
  for (const { column, header } of PUBLISH_COLUMNS[entity]) {
    if (!(column in body) || body[column] === undefined) continue;
    if (isClearedPublishValue(body[column])) {
      errors[column] = [`${header} is required for published items`];
    }
  }
  if (Object.keys(errors).length > 0) {
    throw new ValidationException('Required fields cannot be cleared on a published item', errors);
  }
}

/** Null, blank text, an empty array, and an empty object are a clear. */
export function isClearedPublishValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return true;
  return false;
}
