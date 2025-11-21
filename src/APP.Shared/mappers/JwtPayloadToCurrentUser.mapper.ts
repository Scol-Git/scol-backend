import { JwtPayload } from '@shared/interfaces/security';
import { ICurrentUser } from '@shared/interfaces/domain';

/**
 * Maps JWT payload to ICurrentUser domain model.
 *
 * This conversion separates infrastructure concerns (JWT) from domain concerns (user context).
 *
 * @class JwtPayloadToCurrentUserMapper
 */
export class JwtPayloadToCurrentUserMapper {
  /**
   * Converts JwtPayload to ICurrentUser.
   *
   * Note: allowedOrganizationsId defaults to [orgId] if not provided in JWT.
   * For multi-org support, this should be populated from the JWT or loaded from DB.
   *
   * @param payload - JWT payload from token
   * @param allowedOrganizationsId - Optional list of allowed org IDs (defaults to [orgId])
   * @returns ICurrentUser domain model
   */
  static toCurrentUser(
    payload: JwtPayload,
    allowedOrganizationsId?: string[],
  ): ICurrentUser {
    return {
      userId: payload.sub, // Map 'sub' to 'userId'
      orgId: payload.orgId,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [], // Include permissions from JWT
      isSuperAdmin: payload.isSuperAdmin ?? false, // Default to false if undefined
      allowedOrganizationsId: allowedOrganizationsId ?? [payload.orgId], // Default to primary org
    };
  }
}
