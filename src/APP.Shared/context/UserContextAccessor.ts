import { AsyncLocalStorage } from 'async_hooks';
import { UnauthorizedException } from '@nestjs/common';
import { ICurrentUser } from '@shared/interfaces/domain';

/**
 * Provides access to the current user context throughout the application.
 * Uses Node.js AsyncLocalStorage to maintain request-scoped user context.
 *
 * This pattern is similar to HttpContext.Current in ASP.NET or IHttpContextAccessor in .NET Core,
 * allowing services to access the current user without passing it through every method call.
 *
 * @example
 * // In a service method:
 * const currentUser = UserContextAccessor.userContext;
 * console.log(`Current user: ${currentUser.email}`);
 *
 * // In a middleware/guard:
 * UserContextAccessor.run(user, () => {
 *   // All code in this callback has access to the user context
 *   next();
 * });
 */
export class UserContextAccessor {
  private static _storage = new AsyncLocalStorage<ICurrentUser>();

  /**
   * Gets the current user context for the current async execution context.
   *
   * @returns The current user
   * @throws UnauthorizedException if no user context is found
   *
   * @example
   * const user = UserContextAccessor.userContext;
   * const query = dataSource
   *   .getRepository(Todo)
   *   .createQueryBuilder('todo')
   *   .where('todo.orgId = :orgId', { orgId: user.orgId });
   */
  static get userContext(): ICurrentUser {
    const context = this._storage.getStore();
    if (!context) {
      throw new UnauthorizedException(
        'User context not found. Ensure UserContextMiddleware is registered and user is authenticated.',
      );
    }
    return context;
  }

  /**
   * Attempts to get the current user context without throwing an exception.
   *
   * @returns The current user or null if no context is available
   *
   * @example
   * const user = UserContextAccessor.tryGetUserContext();
   * if (user) {
   *   console.log(`Logged in as: ${user.email}`);
   * } else {
   *   console.log('Anonymous request');
   * }
   */
  static tryGetUserContext(): ICurrentUser | null {
    return this._storage.getStore() || null;
  }

  /**
   * Checks if a user context is currently available.
   *
   * @returns True if a user context exists, false otherwise
   */
  static hasUserContext(): boolean {
    return this._storage.getStore() !== undefined;
  }

  /**
   * Runs a callback within a specific user context.
   * Used by middleware to establish the user context for a request.
   *
   * @param user - The user to set as the current context
   * @param callback - The function to execute with the user context
   * @returns The return value of the callback
   *
   * @example
   * // In middleware:
   * UserContextAccessor.run(user, () => next());
   */
  static run<T>(user: ICurrentUser, callback: () => T): T {
    return this._storage.run(user, callback);
  }

  /**
   * Validates that the current user has access to a specific organization.
   *
   * @param orgId - Organization ID to validate access for
   * @throws UnauthorizedException if user doesn't have access
   *
   * @example
   * // In a service method:
   * UserContextAccessor.validateAccessOnOrganization(todo.orgId);
   */
  static validateAccessOnOrganization(orgId: string): void {
    const user = this.userContext;

    // Super admins have access to all organizations
    if (user.isSuperAdmin) {
      return;
    }

    // Check if user's primary org matches
    if (user.orgId === orgId) {
      return;
    }

    // Check if org is in user's allowed organizations
    if (user.allowedOrganizationsId?.includes(orgId)) {
      return;
    }

    throw new UnauthorizedException(
      `Access denied. You do not have permission to access resources in organization ${orgId}.`,
    );
  }

  /**
   * Checks if the current user has a specific role.
   *
   * @param role - Role to check for
   * @returns True if user has the role, false otherwise
   *
   * @example
   * if (UserContextAccessor.hasRole('admin')) {
   *   // User is an admin
   * }
   */
  static hasRole(role: string): boolean {
    const user = this.tryGetUserContext();
    return user?.roles?.includes(role) ?? false;
  }

  /**
   * Checks if the current user has any of the specified roles.
   *
   * @param roles - Array of roles to check for
   * @returns True if user has any of the roles, false otherwise
   */
  static hasAnyRole(roles: string[]): boolean {
    const user = this.tryGetUserContext();
    return roles.some((role) => user?.roles?.includes(role)) ?? false;
  }

  /**
   * Checks if the current user has all of the specified roles.
   *
   * @param roles - Array of roles to check for
   * @returns True if user has all of the roles, false otherwise
   */
  static hasAllRoles(roles: string[]): boolean {
    const user = this.tryGetUserContext();
    return roles.every((role) => user?.roles?.includes(role)) ?? false;
  }
}
