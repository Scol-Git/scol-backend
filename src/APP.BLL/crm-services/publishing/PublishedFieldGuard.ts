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
    const v = body[column];
    if (v === null || (typeof v === 'string' && v.trim() === '')) {
      errors[column] = [`${header} is required for published items`];
    }
  }
  if (Object.keys(errors).length > 0) {
    throw new ValidationException('Required fields cannot be cleared on a published item', errors);
  }
}
