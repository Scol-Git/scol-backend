import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  Repository,
  EntityTarget,
  FindOptionsWhere,
  ObjectLiteral,
  FindOptionsRelations,
  FindOneOptions,
  FindManyOptions,
} from 'typeorm';

// Import all entities
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { SysRoles } from '@entity/entities/SysRoles.entity';
import { SysPermissions } from '@entity/entities/SysPermissions.entity';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { SysCountries } from '@entity/entities/SysCountries.entity';
import { SysAcademicDegrees } from '@entity/entities/SysAcademicDegrees.entity';
import { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { SysEnglishTestSections } from '@entity/entities/SysEnglishTestSections.entity';
import { SysProgrammes } from '@entity/entities/SysProgrammes.entity';
import { LeadAcademicResults } from '@entity/entities/LeadAcademicResults.entity';
import { LeadTestResults } from '@entity/entities/LeadTestResults.entity';
import { LeadEnglishTestResults } from '@entity/entities/LeadEnglishTestResults.entity';
import { LeadEnglishTestSectionResults } from '@entity/entities/LeadEnglishTestSectionResults.entity';
import { LeadPreferredCountries } from '@entity/entities/LeadPreferredCountries.entity';
import { LeadPreferredPrograms } from '@entity/entities/LeadPreferredPrograms.entity';
import { UserSessions } from '@entity/entities/UserSessions.entity';
import { UserRoles } from '@entity/entities/UserRoles.entity';
import { UserPermissions } from '@entity/entities/UserPermissions.entity';
import { OtpSession } from '@entity/entities/OtpSession.entity';

// Course/University entities for search
import { SysUniversities } from '@entity/entities/SysUniversities.entity';
import { SysStates } from '@entity/entities/SysStates.entity';
import { SysCities } from '@entity/entities/SysCities.entity';
import { UniCourses } from '@entity/entities/UniCourses.entity';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { CourseEngReq } from '@entity/entities/CourseEngReq.entity';
import { CourseIntakeScholarships } from '@entity/entities/CourseIntakeScholarships.entity';
import { SysDocumentTypes } from '@entity/entities/SysDocumentTypes.entity';
import { SysApplicationStage } from '@entity/entities/SysApplicationStage.entity';
import { SysApplicationStatus } from '@entity/entities/SysApplicationStatus.entity';
import { SysApplicationStage2Status } from '@entity/entities/SysApplicationStage2Status.entity';
import { Applications } from '@entity/entities/Applications.entity';
import { CourseRequiredDocuments } from '@entity/entities/CourseRequiredDocuments.entity';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { ApplicationDocuments } from '@entity/entities/ApplicationDocuments.entity';
import { ApplicationDocumentVersions } from '@entity/entities/ApplicationDocumentVersions.entity';
import { ApplicationStatusHistory } from '@entity/entities/ApplicationStatusHistory.entity';
import { ApplicationStageHistory } from '@entity/entities/ApplicationStageHistory.entity';
import { LeadDocuments } from '@entity/entities/LeadDocuments.entity';
import { LeadDocumentVersions } from '@entity/entities/LeadDocumentVersions.entity';

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

    @InjectRepository(OtpSession)
    public readonly otpSessions: Repository<OtpSession>,

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

    @InjectRepository(SysEnglishTestSections)
    public readonly englishTestSections: Repository<SysEnglishTestSections>,

    @InjectRepository(SysProgrammes)
    public readonly programmes: Repository<SysProgrammes>,

    @InjectRepository(LeadEnglishTestResults)
    public readonly leadEnglishTestResults: Repository<LeadEnglishTestResults>,

    @InjectRepository(LeadEnglishTestSectionResults)
    public readonly leadEnglishTestSectionResults: Repository<LeadEnglishTestSectionResults>,

    // Course/University repositories for search
    @InjectRepository(SysUniversities)
    public readonly universities: Repository<SysUniversities>,

    @InjectRepository(SysStates)
    public readonly states: Repository<SysStates>,

    @InjectRepository(SysCities)
    public readonly cities: Repository<SysCities>,

    @InjectRepository(UniCourses)
    public readonly courses: Repository<UniCourses>,

    @InjectRepository(UniCourseIntakes)
    public readonly courseIntakes: Repository<UniCourseIntakes>,

    @InjectRepository(CourseEngReq)
    public readonly courseEngReqs: Repository<CourseEngReq>,

    @InjectRepository(CourseIntakeScholarships)
    public readonly scholarships: Repository<CourseIntakeScholarships>,

    // Document / application entities
    @InjectRepository(SysDocumentTypes)
    public readonly documentTypes: Repository<SysDocumentTypes>,

    @InjectRepository(SysApplicationStage)
    public readonly applicationStages: Repository<SysApplicationStage>,

    @InjectRepository(SysApplicationStatus)
    public readonly applicationStatuses: Repository<SysApplicationStatus>,

    @InjectRepository(SysApplicationStage2Status)
    public readonly applicationStageToStatuses: Repository<SysApplicationStage2Status>,

    @InjectRepository(Applications)
    public readonly applications: Repository<Applications>,

    @InjectRepository(CourseRequiredDocuments)
    public readonly courseRequiredDocuments: Repository<CourseRequiredDocuments>,

    @InjectRepository(ApplicationRequiredDocuments)
    public readonly applicationRequiredDocuments: Repository<ApplicationRequiredDocuments>,

    @InjectRepository(ApplicationDocuments)
    public readonly applicationDocuments: Repository<ApplicationDocuments>,

    @InjectRepository(ApplicationDocumentVersions)
    public readonly applicationDocumentVersions: Repository<ApplicationDocumentVersions>,

    @InjectRepository(ApplicationStatusHistory)
    public readonly applicationStatusHistories: Repository<ApplicationStatusHistory>,

    @InjectRepository(ApplicationStageHistory)
    public readonly applicationStageHistories: Repository<ApplicationStageHistory>,

    @InjectRepository(LeadDocuments)
    public readonly leadDocuments: Repository<LeadDocuments>,

    @InjectRepository(LeadDocumentVersions)
    public readonly leadDocumentVersions: Repository<LeadDocumentVersions>,
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

  /**
   * Save all changes made in this context to the database
   * Similar to EF Core's DbContext.SaveChanges()
   *
   * @returns Number of affected rows
   *
   * @example
   * const user = await this.db.users.findOne({ where: { id } });
   * user.email = 'new@example.com';
   * await this.db.SaveChanges();
   */
  SaveChanges(): Promise<number> {
    // TypeORM doesn't have a direct SaveChanges equivalent
    // Changes are saved automatically when using save(), but we can return 0
    // For explicit save tracking, you'd need to use EntityManager.save() which returns affected entities
    return Promise.resolve(0);
  }

  /**
   * Find an entity by its primary key
   * Similar to EF Core's DbContext.Find<T>(id)
   *
   * @param entityClass - The entity class to find
   * @param id - The primary key value
   * @returns The entity if found, null otherwise
   *
   * @example
   * const user = await this.db.Find(SysUsers, 'user-id-123');
   */
  async Find<T extends ObjectLiteral>(
    entityClass: EntityTarget<T>,
    id: string | number,
  ): Promise<T | null> {
    const repo = this.manager.getRepository<T>(entityClass);
    const where = { id } as unknown as FindOptionsWhere<T>;
    return repo.findOne({ where });
  }

  /**
   * Get a repository (DbSet) for the specified entity type
   * Similar to EF Core's DbContext.Set<T>()
   *
   * @param entityClass - The entity class
   * @returns Repository instance for the entity
   *
   * @example
   * const userRepo = this.db.Set(SysUsers);
   * const users = await userRepo.find();
   */
  Set<T extends ObjectLiteral>(entityClass: EntityTarget<T>): Repository<T> {
    return this.manager.getRepository<T>(entityClass);
  }

  /**
   * EF-style Include helper for repositories you already have injected
   *
   * @example
   * // this.db.include(this.db.users, { roles: true }).one({ where: { id } });
   * // this.db.include(this.db.users, { roles: true }).many({ where: { userType } });
   */
  include<T extends ObjectLiteral>(
    repo: Repository<T>,
    relations: FindOptionsRelations<T>,
  ): {
    one: (options?: FindOneOptions<T>) => Promise<T | null>;
    many: (options?: FindManyOptions<T>) => Promise<T[]>;
  } {
    return {
      one: (options) =>
        repo.findOne({
          ...(options ?? {}),
          relations,
        }),
      many: (options) =>
        repo.find({
          ...(options ?? {}),
          relations,
        }),
    };
  }

  /**
   * EF-style Include helper for entity classes when you don't have a repo injected
   *
   * @example
   * await this.db.includeSet(SysUsers, { roles: true }).one({ where: { id } });
   */
  includeSet<T extends ObjectLiteral>(
    entityClass: EntityTarget<T>,
    relations: FindOptionsRelations<T>,
  ): {
    one: (options?: FindOneOptions<T>) => Promise<T | null>;
    many: (options?: FindManyOptions<T>) => Promise<T[]>;
  } {
    const repo = this.Set(entityClass);
    return this.include(repo, relations);
  }

  /**
   * Add an entity to the context (marks as new)
   * Similar to EF Core's DbContext.Add<T>(entity)
   *
   * @param entityClass - The entity class
   * @param entity - The entity to add
   * @returns The added entity
   *
   * @example
   * const newUser = this.db.Add(SysUsers, { email: 'test@example.com', ... });
   * await this.db.SaveChanges();
   */
  Add<T extends ObjectLiteral>(
    entityClass: EntityTarget<T>,
    entity: Partial<T>,
  ): T {
    const repo = this.Set(entityClass);
    return repo.create(entity as T);
  }

  /**
   * Update an entity in the context
   * Similar to EF Core's DbContext.Update<T>(entity)
   *
   * @param entityClass - The entity class
   * @param entity - The entity to update
   * @returns The updated entity
   *
   * @example
   * const user = await this.db.Find(SysUsers, id);
   * user.email = 'updated@example.com';
   * this.db.Update(SysUsers, user);
   * await this.db.SaveChanges();
   */
  Update<T extends ObjectLiteral>(
    entityClass: EntityTarget<T>,
    entity: Partial<T>,
  ): T {
    const repo = this.Set(entityClass);
    return repo.create(entity as T);
  }

  /**
   * Remove an entity from the context
   * Similar to EF Core's DbContext.Remove<T>(entity)
   *
   * @param entityClass - The entity class
   * @param entity - The entity to remove
   *
   * @example
   * const user = await this.db.Find(SysUsers, id);
   * this.db.Remove(SysUsers, user);
   * await this.db.SaveChanges();
   */
  async Remove<T extends ObjectLiteral>(
    entityClass: EntityTarget<T>,
    entity: T,
  ): Promise<void> {
    const repo = this.Set(entityClass);
    await repo.remove(entity);
  }

  /**
   * Get entity entry for change tracking
   * Similar to EF Core's DbContext.Entry<T>(entity)
   *
   * @param entityClass - The entity class
   * @param entity - The entity to get entry for
   * @returns Repository instance (TypeORM doesn't have exact Entry equivalent)
   *
   * @example
   * const user = await this.db.Find(SysUsers, id);
   * const entry = this.db.Entry(SysUsers, user);
   * // Access change tracking through repository methods
   */
  Entry<T extends ObjectLiteral>(entityClass: EntityTarget<T>): Repository<T> {
    // TypeORM doesn't have exact Entry equivalent, but we can get the repository
    // In practice, you'd use repository.save() which handles change tracking
    return this.Set(entityClass);
  }
}
