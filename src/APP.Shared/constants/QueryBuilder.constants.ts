/**
 * Query Builder Constants
 *
 * Centralized constants for TypeORM query builder to avoid hard-coded strings.
 * Following DRY principle and making queries more maintainable.
 *
 * @class QueryBuilderConstants
 */
export class QueryBuilderConstants {
  // ============================================================================
  // Entity Aliases
  // ============================================================================

  /** Alias for UserRole entity in query builder */
  static readonly USER_ROLE_ALIAS = 'userRole';

  /** Alias for Role entity in query builder */
  static readonly ROLE_ALIAS = 'role';

  /** Alias for RolePermission entity in query builder */
  static readonly ROLE_PERMISSION_ALIAS = 'rolePermission';

  /** Alias for Permission entity in query builder */
  static readonly PERMISSION_ALIAS = 'permission';

  // ============================================================================
  // Join Aliases
  // ============================================================================

  /** Join path for userRole.role relation */
  static readonly JOIN_ROLE = 'userRole.role';

  /** Join path for rolePermission.permission relation */
  static readonly JOIN_PERMISSION = 'rolePermission.permission';

  // ============================================================================
  // Parameter Names
  // ============================================================================

  /** Parameter name for userId */
  static readonly PARAM_USER_ID = 'userId';

  /** Parameter name for orgId */
  static readonly PARAM_ORG_ID = 'orgId';

  /** Parameter name for roleIds array */
  static readonly PARAM_ROLE_IDS = 'roleIds';

  // ============================================================================
  // Where Conditions
  // ============================================================================

  /** Where condition for filtering by userId */
  static readonly WHERE_USER_ID = 'userRole.userId = :userId';

  /** Where condition for filtering by orgId */
  static readonly WHERE_ORG_ID = 'userRole.orgId = :orgId';

  /** Where condition for filtering by roleIds array */
  static readonly WHERE_ROLE_IDS = 'rolePermission.roleId IN (:...roleIds)';
}
