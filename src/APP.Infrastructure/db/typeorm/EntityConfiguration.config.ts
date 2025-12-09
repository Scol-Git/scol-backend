/**
 * Entity Configuration Pattern - Similar to EF Core's OnModelCreating
 *
 * This file provides a centralized place to configure entity relationships,
 * indexes, constraints, and other database-level configurations.
 *
 * In EF Core, this would be done in DbContext.OnModelCreating():
 * ```csharp
 * protected override void OnModelCreating(ModelBuilder modelBuilder)
 * {
 *     modelBuilder.Entity<User>()
 *         .HasMany(u => u.Roles)
 *         .WithMany(r => r.Users)
 *         .UsingEntity<UserRole>();
 * }
 * ```
 *
 * In TypeORM, most configuration is done via decorators on entities,
 * but this file serves as documentation and a place for additional
 * programmatic configuration if needed.
 */

import { DataSource } from 'typeorm';

/**
 * Configure entity relationships and constraints
 * Called during DataSource initialization
 *
 * @param dataSource - TypeORM DataSource instance
 */
export function configureEntities(dataSource: DataSource): void {
  // Most configuration is done via decorators in entity files
  // This function can be used for:
  // - Dynamic index creation
  // - Complex constraint definitions
  // - Relationship configurations that can't be expressed via decorators
  // Example: Add custom indexes
  // const queryRunner = dataSource.createQueryRunner();
  // await queryRunner.createIndex('sys_Users', new TableIndex({
  //   name: 'IDX_users_email_phone',
  //   columnNames: ['email', 'phone']
  // }));
  // Example: Add check constraints
  // await queryRunner.query(`
  //   ALTER TABLE "sys_Users"
  //   ADD CONSTRAINT "CK_users_email_or_phone"
  //   CHECK (email IS NOT NULL OR phone IS NOT NULL)
  // `);
}

/**
 * Entity Configuration Documentation
 *
 * This section documents how entities are configured, similar to
 * EF Core's fluent API configuration comments.
 */

/**
 * SysUsers Configuration:
 * - Primary Key: id (UUID)
 * - Unique: email, phone
 * - Relationships:
 *   - Many-to-Many with SysRoles via UserRoles junction table
 *   - Many-to-Many with SysPermissions via UserPermissions junction table
 *   - One-to-Many with UserSessions
 *   - One-to-One with SysLeadProfiles
 */
export const SysUsersConfig = {
  tableName: 'sys_Users',
  primaryKey: 'id',
  uniqueColumns: ['email', 'phone'],
  indexes: [
    { columns: ['email'], unique: true },
    { columns: ['phone'], unique: true },
    { columns: ['accountStatus'] },
    { columns: ['userType'] },
  ],
};

/**
 * UserRoles Configuration:
 * - Composite Primary Key: (user_id, role_id)
 * - Foreign Keys:
 *   - user_id -> sys_Users.id
 *   - role_id -> sys_Roles.id
 * - Indexes: user_id, role_id
 */
export const UserRolesConfig = {
  tableName: 'UserRoles',
  primaryKey: ['user_id', 'role_id'],
  foreignKeys: [
    { column: 'user_id', references: 'sys_Users.id' },
    { column: 'role_id', references: 'sys_Roles.id' },
  ],
  indexes: [{ columns: ['user_id'] }, { columns: ['role_id'] }],
};

/**
 * UserPermissions Configuration:
 * - Composite Primary Key: (user_id, permission_id)
 * - Foreign Keys:
 *   - user_id -> sys_Users.id
 *   - permission_id -> sys_Permissions.id
 * - Indexes: user_id, permission_id
 */
export const UserPermissionsConfig = {
  tableName: 'UserPermissions',
  primaryKey: ['user_id', 'permission_id'],
  foreignKeys: [
    { column: 'user_id', references: 'sys_Users.id' },
    { column: 'permission_id', references: 'sys_Permissions.id' },
  ],
  indexes: [{ columns: ['user_id'] }, { columns: ['permission_id'] }],
};

/**
 * Usage in migrations or DataSource setup:
 *
 * ```typescript
 * const dataSource = new DataSource({...});
 * await dataSource.initialize();
 * configureEntities(dataSource);
 * ```
 */

