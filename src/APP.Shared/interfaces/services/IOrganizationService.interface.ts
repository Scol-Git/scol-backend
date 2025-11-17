import { SearchOrganizationsRequestDto } from '@shared/dtos/organizations/SearchOrganizationsRequestDto.dto';
import { CreateOrganizationRequestDto } from '@shared/dtos/organizations/CreateOrganizationRequestDto.dto';
import { UpdateOrganizationRequestDto } from '@shared/dtos/organizations/UpdateOrganizationRequestDto.dto';
import { OrganizationResponseDto } from '@shared/dtos/organizations/OrganizationResponseDto.dto';
import { PaginatedResponse } from '@shared/models/PaginatedResponse';

/**
 * Interface for Organization Service.
 * 
 * Defines the contract for organization management operations.
 * Follows .NET Core's approach of programming to interfaces, not implementations.
 * 
 * @interface IOrganizationService
 * 
 * @example
 * ```typescript
 * // Get organization by ID
 * const org = await organizationService.getById('123');
 * 
 * // Create organization
 * const newOrg = await organizationService.create(createDto);
 * 
 * // List organizations with pagination
 * const result = await organizationService.list(searchDto);
 * ```
 */
export interface IOrganizationService {
  /**
   * Get paginated list of organizations with filtering and sorting.
   * 
   * @param searchDto - Search parameters for pagination, filtering, and sorting
   * @returns Paginated response containing organizations
   */
  list(
    searchDto: SearchOrganizationsRequestDto,
  ): Promise<PaginatedResponse<OrganizationResponseDto>>;

  /**
   * Get single organization by ID.
   * 
   * @param id - Organization ID
   * @returns Organization DTO
   * @throws NotFoundException if organization not found
   */
  getById(id: string): Promise<OrganizationResponseDto>;

  /**
   * Create new organization.
   * 
   * @param dto - Organization creation data
   * @returns Created organization DTO
   * @throws ConflictException if organization with same name already exists
   */
  create(dto: CreateOrganizationRequestDto): Promise<OrganizationResponseDto>;

  /**
   * Update existing organization.
   * 
   * @param id - Organization ID
   * @param dto - Organization update data
   * @returns Updated organization DTO
   * @throws NotFoundException if organization not found
   * @throws ConflictException if new name conflicts with existing organization
   */
  update(
    id: string,
    dto: UpdateOrganizationRequestDto,
  ): Promise<OrganizationResponseDto>;

  /**
   * Delete organization.
   * 
   * @param id - Organization ID
   * @throws NotFoundException if organization not found
   */
  delete(id: string): Promise<void>;
}

