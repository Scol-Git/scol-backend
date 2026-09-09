import { VerifiedJwtPayload } from '@shared/interfaces/security';
import { ICurrentUser } from '@shared/interfaces/domain';

/**
 * Maps JWT payload to ICurrentUser domain model.
 */
export class JwtPayloadToCurrentUserMapper {
  static toCurrentUser(
    payload: VerifiedJwtPayload,
    allowedOrganizationsId?: string[],
  ): ICurrentUser {
    const orgId = payload.orgId ?? '';
    return {
      userId: payload.sub,
      sessionId: payload.sid ?? '',
      orgId,
      email: payload.email ?? '',
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      isSuperAdmin: payload.isSuperAdmin ?? false,
      allowedOrganizationsId: allowedOrganizationsId ?? [orgId],
    };
  }
}
