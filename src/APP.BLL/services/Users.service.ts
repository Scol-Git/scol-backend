// import { Injectable, NotFoundException } from '@nestjs/common';
// import { EntityManager } from 'typeorm';
// import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
// import { SysUsers } from '@entity/entities/SysUsers.entity';
// import { SysRoles } from '@entity/entities/SysRoles.entity';
// import { SysPermissions } from '@entity/entities/SysPermissions.entity';
// import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';

// /**
//  * UsersService - Example service using EF Core-style patterns with AppDbContext
//  *
//  * This service demonstrates:
//  * - Single DbContext injection (instead of multiple repositories)
//  * - Include/relations for eager loading (like EF Core's .Include())
//  * - Navigation property manipulation
//  * - Transaction support
//  * - QueryBuilder with joins
//  */
// @Injectable()
// export class UsersService {
//   constructor(private readonly db: AppDbContext) {}

//   // ========================================
//   // CREATE Operations (EF Core style)
//   // ========================================

//   /**
//    * Create a new user
//    * Similar to: dbContext.Users.Add(user); dbContext.SaveChanges();
//    */
//   async createUser(
//     email: string,
//     phone: string,
//     passwordHash: string,
//   ): Promise<SysUsers> {
//     // Create entity instance
//     const user = this.db.users.create({
//       email,
//       phone,
//       passwordHash,
//       accountStatus: 'Active',
//       isPhoneVerified: false,
//       totalOtpAttempt: 0,
//       roles: [], // Initialize navigation collections
//       permissions: [],
//       sessions: [],
//     });

//     // Save to database
//     return await this.db.users.save(user);
//   }

//   /**
//    * Create a user with roles (using navigation properties)
//    * Similar to: user.Roles.Add(role); dbContext.SaveChanges();
//    */
//   async createUserWithRoles(
//     email: string,
//     phone: string,
//     passwordHash: string,
//     roleIds: string[],
//   ): Promise<SysUsers> {
//     // Fetch roles to assign
//     const roles = await this.db.roles.findByIds(roleIds);

//     if (roles.length !== roleIds.length) {
//       throw new NotFoundException('One or more roles not found');
//     }

//     // Create user with roles via navigation property
//     const user = this.db.users.create({
//       email,
//       phone,
//       passwordHash,
//       accountStatus: 'Active',
//       isPhoneVerified: false,
//       totalOtpAttempt: 0,
//       roles, // Assign roles directly (EF Core style!)
//       permissions: [],
//       sessions: [],
//     });

//     return await this.db.users.save(user);
//   }

//   // ========================================
//   // READ Operations with Include (EF Core style)
//   // ========================================

//   /**
//    * Get user by ID with Include
//    * Similar to: dbContext.Users.Include(u => u.Roles).FirstOrDefault(u => u.Id == id)
//    */
//   async getUserById(id: string): Promise<SysUsers | null> {
//     return await this.db.users.findOne({
//       where: { id },
//       relations: {
//         roles: true, // Include roles (like EF Core's .Include())
//         permissions: true, // Include permissions
//       },
//     });
//   }

//   /**
//    * Get user with nested includes
//    * Similar to: dbContext.Users
//    *   .Include(u => u.LeadProfile)
//    *     .ThenInclude(lp => lp.AcademicResults)
//    *       .ThenInclude(ar => ar.Degree)
//    *   .Include(u => u.LeadProfile)
//    *     .ThenInclude(lp => lp.TestResults)
//    *       .ThenInclude(tr => tr.Test)
//    */
//   async getUserWithCompleteProfile(id: string): Promise<SysUsers | null> {
//     return await this.db.users.findOne({
//       where: { id },
//       relations: {
//         roles: true,
//         permissions: true,
//         leadProfile: {
//           academicResults: {
//             degree: true, // Nested include (ThenInclude)
//           },
//           testResults: {
//             test: true, // Nested include
//           },
//           preferredCountries: {
//             country: true,
//           },
//           preferredPrograms: {
//             programme: true,
//           },
//         },
//       },
//     });
//   }

//   /**
//    * Get users with QueryBuilder and joins (more control)
//    * Similar to: dbContext.Users
//    *   .Where(u => u.AccountStatus == "Active")
//    *   .Include(u => u.Roles)
//    *   .Include(u => u.Permissions)
//    */
//   async getActiveUsersWithRoles(): Promise<SysUsers[]> {
//     return await this.db.users
//       .createQueryBuilder('user')
//       .leftJoinAndSelect('user.roles', 'roles')
//       .leftJoinAndSelect('user.permissions', 'permissions')
//       .where('user.accountStatus = :status', { status: 'Active' })
//       .orderBy('user.createdAt', 'DESC')
//       .getMany();
//   }

//   /**
//    * Find users by email with includes
//    */
//   async findUserByEmail(email: string): Promise<SysUsers | null> {
//     return await this.db.users.findOne({
//       where: { email },
//       relations: {
//         roles: true,
//         permissions: true,
//       },
//     });
//   }

//   // ========================================
//   // UPDATE Operations (EF Core style)
//   // ========================================

//   /**
//    * Update user properties
//    * Similar to: user.Email = newEmail; dbContext.SaveChanges();
//    */
//   async updateUserEmail(id: string, newEmail: string): Promise<void> {
//     const user = await this.db.users.findOne({ where: { id } });

//     if (!user) {
//       throw new NotFoundException('User not found');
//     }

//     user.email = newEmail;
//     await this.db.users.save(user);
//   }

//   /**
//    * Assign role to user (manipulating navigation collections)
//    * Similar to: user.Roles.Add(role); dbContext.SaveChanges();
//    */
//   async assignRoleToUser(userId: string, roleId: string): Promise<void> {
//     // Load user with existing roles
//     const user = await this.db.users.findOne({
//       where: { id: userId },
//       relations: { roles: true },
//     });

//     if (!user) {
//       throw new NotFoundException('User not found');
//     }

//     // Load the role to assign
//     const role = await this.db.roles.findOne({ where: { id: roleId } });

//     if (!role) {
//       throw new NotFoundException('Role not found');
//     }

//     // Check if role already assigned
//     if (user.roles.some((r: SysRoles) => r.id === roleId)) {
//       return; // Already has this role
//     }

//     // Add to navigation collection (EF Core style!)
//     user.roles.push(role);

//     // Save changes (TypeORM handles the junction table)
//     await this.db.users.save(user);
//   }

//   /**
//    * Remove role from user
//    * Similar to: user.Roles.Remove(role); dbContext.SaveChanges();
//    */
//   async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
//     const user = await this.db.users.findOne({
//       where: { id: userId },
//       relations: { roles: true },
//     });

//     if (!user) {
//       throw new NotFoundException('User not found');
//     }

//     // Remove from navigation collection (EF Core style!)
//     user.roles = user.roles.filter((role: SysRoles) => role.id !== roleId);

//     // Save changes (TypeORM handles the junction table)
//     await this.db.users.save(user);
//   }

//   /**
//    * Assign multiple permissions to user at once
//    */
//   async assignPermissionsToUser(
//     userId: string,
//     permissionIds: string[],
//   ): Promise<void> {
//     const user = await this.db.users.findOne({
//       where: { id: userId },
//       relations: { permissions: true },
//     });

//     if (!user) {
//       throw new NotFoundException('User not found');
//     }

//     const permissions = await this.db.permissions.findByIds(permissionIds);

//     if (permissions.length !== permissionIds.length) {
//       throw new NotFoundException('One or more permissions not found');
//     }

//     // Filter out already assigned permissions
//     const newPermissions = permissions.filter(
//       (perm: SysPermissions) =>
//         !user.permissions.some((up: SysPermissions) => up.id === perm.id),
//     );

//     // Add to navigation collection
//     user.permissions.push(...newPermissions);

//     await this.db.users.save(user);
//   }

//   // ========================================
//   // DELETE Operations
//   // ========================================

//   /**
//    * Soft delete user (update status)
//    * Similar to: user.AccountStatus = "Deleted"; dbContext.SaveChanges();
//    */
//   async deactivateUser(id: string): Promise<void> {
//     const user = await this.db.users.findOne({ where: { id } });

//     if (!user) {
//       throw new NotFoundException('User not found');
//     }

//     user.accountStatus = 'Inactive';
//     await this.db.users.save(user);
//   }

//   /**
//    * Hard delete user
//    * Similar to: dbContext.Users.Remove(user); dbContext.SaveChanges();
//    */
//   async deleteUser(id: string): Promise<void> {
//     const user = await this.db.users.findOne({ where: { id } });

//     if (!user) {
//       throw new NotFoundException('User not found');
//     }

//     await this.db.users.remove(user);
//   }

//   // ========================================
//   // TRANSACTION Operations (EF Core style)
//   // ========================================

//   /**
//    * Create user with lead profile in a transaction
//    * Similar to:
//    * using (var transaction = dbContext.Database.BeginTransaction()) {
//    *   dbContext.Users.Add(user);
//    *   dbContext.LeadProfiles.Add(profile);
//    *   dbContext.SaveChanges();
//    *   transaction.Commit();
//    * }
//    */
//   async createUserWithProfile(
//     email: string,
//     phone: string,
//     passwordHash: string,
//     fullName: string,
//     roleIds: string[],
//   ): Promise<SysUsers> {
//     return await this.db.transaction(async (manager: EntityManager) => {
//       const userRepo = manager.getRepository(SysUsers);
//       const roleRepo = manager.getRepository(SysRoles);
//       const profileRepo = manager.getRepository(SysLeadProfiles);

//       // Get roles
//       const roles = await roleRepo.findByIds(roleIds);

//       // Create user
//       const user = userRepo.create({
//         email,
//         phone,
//         passwordHash,
//         accountStatus: 'Active',
//         isPhoneVerified: false,
//         totalOtpAttempt: 0,
//         roles,
//         permissions: [],
//         sessions: [],
//       });

//       const savedUser = await userRepo.save(user);

//       // Create profile
//       const profile = profileRepo.create({
//         userId: savedUser.id,
//         fullName,
//         user: savedUser,
//       });

//       await profileRepo.save(profile);

//       // Return user with profile loaded
//       return (await userRepo.findOne({
//         where: { id: savedUser.id },
//         relations: { roles: true, leadProfile: true },
//       })) as SysUsers;
//     });
//   }

//   /**
//    * Update user and profile atomically
//    */
//   async updateUserAndProfile(
//     userId: string,
//     userData: Partial<SysUsers>,
//     profileData: Partial<SysLeadProfiles>,
//   ): Promise<void> {
//     await this.db.transaction(async (manager: EntityManager) => {
//       const userRepo = manager.getRepository(SysUsers);
//       const profileRepo = manager.getRepository(SysLeadProfiles);

//       // Update user
//       await userRepo.update(userId, userData);

//       // Update profile
//       await profileRepo.update({ userId }, profileData);
//     });
//   }

//   // ========================================
//   // COMPLEX QUERIES (EF Core LINQ-like)
//   // ========================================

//   /**
//    * Get users with specific role
//    * Similar to: dbContext.Users.Where(u => u.Roles.Any(r => r.Name == roleName))
//    */
//   async getUsersByRoleName(roleName: string): Promise<SysUsers[]> {
//     return await this.db.users
//       .createQueryBuilder('user')
//       .leftJoinAndSelect('user.roles', 'role')
//       .leftJoinAndSelect('user.permissions', 'permissions')
//       .where('role.name = :roleName', { roleName })
//       .getMany();
//   }

//   /**
//    * Get users with specific permission
//    */
//   async getUsersByPermission(permissionName: string): Promise<SysUsers[]> {
//     return await this.db.users
//       .createQueryBuilder('user')
//       .leftJoinAndSelect('user.permissions', 'permission')
//       .leftJoinAndSelect('user.roles', 'roles')
//       .where('permission.name = :permissionName', { permissionName })
//       .getMany();
//   }

//   /**
//    * Count users by role
//    * Similar to: dbContext.Users.Count(u => u.Roles.Any(r => r.Id == roleId))
//    */
//   async countUsersByRole(roleId: string): Promise<number> {
//     return await this.db.users
//       .createQueryBuilder('user')
//       .leftJoin('user.roles', 'role')
//       .where('role.id = :roleId', { roleId })
//       .getCount();
//   }

//   /**
//    * Check if user has permission
//    * Similar to: user.Permissions.Any(p => p.Name == permissionName)
//    */
//   async userHasPermission(
//     userId: string,
//     permissionName: string,
//   ): Promise<boolean> {
//     const user = await this.db.users.findOne({
//       where: { id: userId },
//       relations: { permissions: true, roles: true },
//     });

//     if (!user) {
//       return false;
//     }

//     // Check direct permissions
//     return user.permissions.some(
//       (p: SysPermissions) => p.name === permissionName,
//     );
//   }

//   /**
//    * Get paginated users with includes
//    * Similar to: dbContext.Users.Skip(skip).Take(take).Include(u => u.Roles)
//    */
//   async getPaginatedUsers(
//     page: number = 1,
//     pageSize: number = 10,
//   ): Promise<{ users: SysUsers[]; total: number }> {
//     const [users, total] = await this.db.users.findAndCount({
//       relations: { roles: true, permissions: true },
//       skip: (page - 1) * pageSize,
//       take: pageSize,
//       order: { createdAt: 'DESC' },
//     });

//     return { users, total };
//   }
// }
