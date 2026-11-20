import { ValidationException } from '@shared/exceptions/ValidationException';
import type { ReadinessEntity } from './PublishReadinessChecker';

/** Fields that may be set on a draft and must stay the same once that row is published. */
const PUBLISHED_IDENTITY: Record<ReadinessEntity, readonly string[]> = {
  university: ['uniName', 'sysCountryId', 'sysStateId', 'sysCityId'],
  course: ['courseName', 'sysProgrammeId', 'sysDegreeId'],
  intake: ['intakeMonth', 'intakeYear'],
};

/**
 * On a published row, identity fields cannot be changed to a different value.
 * Keys omitted from the PATCH are left as they are.
 */
export function assertPublishedIdentityUnchanged(
  entity: ReadinessEntity,
  isPublished: boolean,
  current: object,
  dto: object,
): void {
  if (!isPublished) return;
  const body = dto as Record<string, unknown>;
  const row = current as Record<string, unknown>;
  const errors: Record<string, string[]> = {};
  for (const field of PUBLISHED_IDENTITY[entity]) {
    if (!(field in body) || body[field] === undefined) continue;
    if (!sameIdentityValue(row[field], body[field])) {
      errors[field] = ['Cannot be changed after publish'];
    }
  }
  if (Object.keys(errors).length > 0) {
    throw new ValidationException('Published identity fields cannot be changed', errors);
  }
}

function sameIdentityValue(current: unknown, next: unknown): boolean {
  if (current == null && next == null) return true;
  if (typeof current === 'number' || typeof next === 'number') {
    return Number(current) === Number(next);
  }
  return String(current ?? '').trim() === String(next ?? '').trim();
}
