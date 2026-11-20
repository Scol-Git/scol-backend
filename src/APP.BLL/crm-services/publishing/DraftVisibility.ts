import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

/** Only admins review drafts; counsellors see published data only. */
export function canSeeDrafts(user: Pick<ICurrentUser, 'roles' | 'isSuperAdmin'> | null | undefined): boolean {
  if (!user) return false;
  return user.isSuperAdmin === true || (user.roles ?? []).includes(Role.ADMIN);
}
