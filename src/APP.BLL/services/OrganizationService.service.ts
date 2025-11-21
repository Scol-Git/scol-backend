import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { BaseService } from '@bll/core/BaseService';
import type { ILogger } from '@shared/interfaces/logging';
import type { IMapper } from '@shared/interfaces/mapping';
import { CreateOrganizationRequestDto } from '@shared/dtos/organizations/CreateOrganizationRequestDto.dto';
import { UpdateOrganizationRequestDto } from '@shared/dtos/organizations/UpdateOrganizationRequestDto.dto';
import { SearchOrganizationsRequestDto } from '@shared/dtos/organizations/SearchOrganizationsRequestDto.dto';
import { OrganizationResponseDto } from '@shared/dtos/organizations/OrganizationResponseDto.dto';
import { PaginatedResponse } from '@shared/models/PaginatedResponse';
import { PagedQuery } from '@shared/models/PagedQuery';

import { Organization } from '@entity/entities/Organization.entity';
import type { IOrganizationService } from '@shared/interfaces/services';

/**
 * Organization service implementing full CRUD operations with pagination,
 * filtering, and sorting support using the Direct DbContext Pattern.
 *
 * Implements IOrganizationService interface following .NET's approach
 * of programming to interfaces, not implementations.
 *
 * Extends BaseService for common functionality (repository access, logger, mapper).
 */
@Injectable()
export class OrganizationService
  extends BaseService<Organization>
  implements IOrganizationService
{
  protected getEntityClass(): new () => Organization {
    return Organization;
  }

  /**
   * Get paginated list of organizations with filtering and sorting.
   *
   * @param searchDto - Search parameters for pagination, filtering, and sorting
   * @returns Paginated response containing organizations
   *
   * @example
   * const result = await service.list({
   *   pageNumber: 1,
   *   pageSize: 10,
   *   filters: [{ propertyName: 'name', operator: 'contains', value: 'Acme' }]
   * });
   */
  async list(
    searchDto: SearchOrganizationsRequestDto,
  ): Promise<PaginatedResponse<OrganizationResponseDto>> {
    // Build PagedQuery from DTO
    const pagedQuery = new PagedQuery<Organization>();
    pagedQuery.pageNumber = searchDto.pageNumber || 1;
    pagedQuery.pageSize = searchDto.pageSize || 10;
    pagedQuery.sortColumns = searchDto.sortColumns || 'createdAt';
    pagedQuery.sortDirections = searchDto.sortDirections || 'desc';

    // Validate pagination parameters
    pagedQuery.validatePaginationParameters();

    // Use filters directly from search DTO (if provided)
    if (
      searchDto.filters &&
      Array.isArray(searchDto.filters) &&
      searchDto.filters.length > 0
    ) {
      pagedQuery.filters = searchDto.filters;
    }

    // Build query with extension methods using entity class directly (EF-style)
    const queryBuilder = this._dbContext
      .createQueryBuilder(Organization, 'organization')
      .applyDynamicFilters(pagedQuery.filters)
      .applyDynamicSorting(
        pagedQuery.getSortColumns(),
        pagedQuery.getSortDirections(),
      )
      .applyPagination(pagedQuery);

    // Get total count (before pagination)
    const countQuery = this._dbContext
      .createQueryBuilder(Organization, 'organization')
      .applyDynamicFilters(pagedQuery.filters);
    const totalCount = await countQuery.getCount();

    // Execute query
    const entities = await queryBuilder.getMany();

    // Map to DTOs
    const dtos = this._mapper.mapArray(
      entities,
      Organization,
      OrganizationResponseDto,
    );

    this._logger.LogInfo('Organizations retrieved', {
      count: dtos.length,
      totalCount,
      pageNumber: pagedQuery.pageNumber,
    });

    return PaginatedResponse.create(
      dtos,
      totalCount,
      pagedQuery.pageNumber,
      pagedQuery.pageSize,
    );
  }

  /**
   * Get single organization by ID.
   *
   * @param id - Organization ID
   * @returns Organization DTO
   * @throws NotFoundException if organization not found
   */
  async getById(id: string): Promise<OrganizationResponseDto> {
    this._logger.LogInfo('Getting organization by ID', { id });

    const entity = await this.getRepository().findOne({ where: { id } });

    if (!entity) {
      this._logger.LogWarning('Organization not found', { id });
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return this._mapper.map(entity, Organization, OrganizationResponseDto);
  }

  /**
   * Create new organization.
   *
   * @param dto - Organization creation data
   * @returns Created organization DTO
   * @throws ConflictException if organization with same name already exists
   */
  async create(
    dto: CreateOrganizationRequestDto,
  ): Promise<OrganizationResponseDto> {
    this._logger.LogInfo('Creating organization', { name: dto.name });

    const repo = this.getRepository();

    // Check for duplicates
    const exists = await repo.findOne({ where: { name: dto.name } });
    if (exists) {
      this._logger.LogWarning('Organization already exists', {
        name: dto.name,
      });
      throw new ConflictException(
        `Organization with name '${dto.name}' already exists`,
      );
    }

    // Create entity
    const org = repo.create({ name: dto.name });
    await repo.save(org);

    this._logger.LogInfo('Organization created', {
      orgId: org.id,
      name: org.name,
    });

    return this._mapper.map(org, Organization, OrganizationResponseDto);
  }

  /**
   * Update existing organization.
   *
   * @param id - Organization ID
   * @param dto - Organization update data
   * @returns Updated organization DTO
   * @throws NotFoundException if organization not found
   * @throws ConflictException if new name conflicts with existing organization
   */
  async update(
    id: string,
    dto: UpdateOrganizationRequestDto,
  ): Promise<OrganizationResponseDto> {
    this._logger.LogInfo('Updating organization', { id, dto });

    const repo = this.getRepository();

    // Find existing organization
    const entity = await repo.findOne({ where: { id } });
    if (!entity) {
      this._logger.LogWarning('Organization not found', { id });
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Check name uniqueness (if name is being changed)
    if (dto.name !== entity.name) {
      const exists = await repo.findOne({ where: { name: dto.name } });
      if (exists) {
        this._logger.LogWarning('Organization name already exists', {
          name: dto.name,
        });
        throw new ConflictException(
          `Organization with name '${dto.name}' already exists`,
        );
      }
    }

    // Update fields
    entity.name = dto.name;
    await repo.save(entity);

    this._logger.LogInfo('Organization updated', { orgId: entity.id });

    return this._mapper.map(entity, Organization, OrganizationResponseDto);
  }

  /**
   * Delete organization.
   *
   * Note: This performs a hard delete. For soft delete functionality,
   * add a 'deletedAt' column to BaseEntity and use:
   * entity.deletedAt = new Date(); await repo.save(entity);
   *
   * @param id - Organization ID
   * @throws NotFoundException if organization not found
   */
  async delete(id: string): Promise<void> {
    this._logger.LogInfo('Deleting organization', { id });

    const repo = this.getRepository();

    const entity = await repo.findOne({ where: { id } });
    if (!entity) {
      this._logger.LogWarning('Organization not found', { id });
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Hard delete
    await repo.delete(id);

    this._logger.LogInfo('Organization deleted', { orgId: id });
  }
}
