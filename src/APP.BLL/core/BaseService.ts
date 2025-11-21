import { Inject, Injectable } from '@nestjs/common';
import { DataSource as DbContext, Repository } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import type { ILogger } from '@shared/interfaces/logging';
import type { IMapper } from '@shared/interfaces/mapping';
import {
  ILogger as ILoggerToken,
  IMapper as IMapperToken,
} from '@shared/tokens/injection.tokens';
import { BaseEntity } from '@entity/entities/BaseEntity.template';

/**
 * Base Service Class
 * 
 * Provides common functionality for all application services.
 * Reduces code duplication by centralizing common patterns like:
 * - Repository access
 * - Logger injection
 * - Mapper injection
 * 
 * Services that work with a single entity type should extend this class.
 * Services that work with multiple entities (like AuthService) should not extend this.
 * 
 * @abstract
 * @template T - The entity type that extends BaseEntity
 * 
 * @example
 * ```typescript
 * @Injectable()
 * export class OrganizationService extends BaseService<Organization> implements IOrganizationService {
 *   protected getEntityClass(): new () => Organization {
 *     return Organization;
 *   }
 *   
 *   async getById(id: string): Promise<OrganizationResponseDto> {
 *     const entity = await this.getRepository().findOne({ where: { id } });
 *     // ...
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class BaseService<T extends BaseEntity> {
  constructor(
    @InjectDataSource() protected readonly _dbContext: DbContext,
    @Inject(ILoggerToken) protected readonly _logger: ILogger,
    @Inject(IMapperToken) protected readonly _mapper: IMapper,
  ) {}

  /**
   * Gets the repository for the entity type T.
   * 
   * @returns Repository instance for the entity type
   */
  protected getRepository(): Repository<T> {
    return this._dbContext.getRepository(this.getEntityClass());
  }

  /**
   * Abstract method that must be implemented by subclasses.
   * Returns the entity class constructor for type T.
   * 
   * @returns Entity class constructor
   */
  protected abstract getEntityClass(): new () => T;
}

