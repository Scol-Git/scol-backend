import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

// Import all entities
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { SysRoles } from '@entity/entities/SysRoles.entity';
import { SysPermissions } from '@entity/entities/SysPermissions.entity';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { SysCountries } from '@entity/entities/SysCountries.entity';
import { SysAcademicDegrees } from '@entity/entities/SysAcademicDegrees.entity';
import { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { SysProgrammes } from '@entity/entities/SysProgrammes.entity';
import { LeadAcademicResults } from '@entity/entities/LeadAcademicResults.entity';
import { LeadTestResults } from '@entity/entities/LeadTestResults.entity';
import { LeadPreferredCountries } from '@entity/entities/LeadPreferredCountries.entity';
import { LeadPreferredPrograms } from '@entity/entities/LeadPreferredPrograms.entity';
import { UserSessions } from '@entity/entities/UserSessions.entity';
import { UserRoles } from '@entity/entities/UserRoles.entity';
import { UserPermissions } from '@entity/entities/UserPermissions.entity';

/**
 * AppDbContext - EF Core-style DbContext for TypeORM
 *
 * Provides centralized access to all repositories through a single injection point.
 * Similar to Entity Framework Core's DbContext pattern.
 *
 * @example
 * // In your service:
 * constructor(private readonly db: AppDbContext) {}
 *
 * // Access repositories:
 * const user = await this.db.users.findOne({ where: { id } });
 *
 * // Use Include (relations):
 * const user = await this.db.users.findOne({
 *   where: { id },
 *   relations: { roles: true, permissions: true }
 * });
 *
 * // Use transactions:
 * await this.db.transaction(async (manager) => {
 *   // Your transactional work here
 * });
 */
@Injectable()
export class AppDbContext {
  constructor(
    // Core user management entities
    @InjectRepository(SysUsers)
    public readonly users: Repository<SysUsers>,

    @InjectRepository(SysRoles)
    public readonly roles: Repository<SysRoles>,

    @InjectRepository(SysPermissions)
    public readonly permissions: Repository<SysPermissions>,

    @InjectRepository(UserRoles)
    public readonly userRoles: Repository<UserRoles>,

    @InjectRepository(UserPermissions)
    public readonly userPermissions: Repository<UserPermissions>,

    @InjectRepository(UserSessions)
    public readonly userSessions: Repository<UserSessions>,

    // Lead profile entities
    @InjectRepository(SysLeadProfiles)
    public readonly leadProfiles: Repository<SysLeadProfiles>,

    @InjectRepository(LeadAcademicResults)
    public readonly leadAcademicResults: Repository<LeadAcademicResults>,

    @InjectRepository(LeadTestResults)
    public readonly leadTestResults: Repository<LeadTestResults>,

    @InjectRepository(LeadPreferredCountries)
    public readonly leadPreferredCountries: Repository<LeadPreferredCountries>,

    @InjectRepository(LeadPreferredPrograms)
    public readonly leadPreferredPrograms: Repository<LeadPreferredPrograms>,

    // Lookup/reference entities
    @InjectRepository(SysCountries)
    public readonly countries: Repository<SysCountries>,

    @InjectRepository(SysAcademicDegrees)
    public readonly academicDegrees: Repository<SysAcademicDegrees>,

    @InjectRepository(SysEnglishTests)
    public readonly englishTests: Repository<SysEnglishTests>,

    @InjectRepository(SysProgrammes)
    public readonly programmes: Repository<SysProgrammes>,
  ) {}

  /**
   * Execute work within a transaction
   * Similar to EF Core's Database.BeginTransaction() or using TransactionScope
   *
   * @example
   * await this.db.transaction(async (manager) => {
   *   const userRepo = manager.getRepository(SysUsers);
   *   const profileRepo = manager.getRepository(SysLeadProfiles);
   *
   *   await userRepo.save(user);
   *   await profileRepo.save(profile);
   * });
   */
  async transaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.users.manager.transaction(work);
  }

  /**
   * Get the underlying EntityManager
   * Similar to EF Core's DbContext.Database or accessing the context directly
   */
  get manager(): EntityManager {
    return this.users.manager;
  }
}
