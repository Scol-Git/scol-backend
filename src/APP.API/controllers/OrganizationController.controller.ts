import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';

import type { ILogger } from '@shared/interfaces/logging';
import type { IOrganizationService } from '@shared/interfaces/services';
import {
  ILogger as ILoggerToken,
  IOrganizationService as IOrganizationServiceToken,
} from '@shared/tokens/injection.tokens';
import { CreateOrganizationRequestDto } from '@shared/dtos/organizations/CreateOrganizationRequestDto.dto';
import { UpdateOrganizationRequestDto } from '@shared/dtos/organizations/UpdateOrganizationRequestDto.dto';
import { ListOrganizationsQueryDto } from '@shared/dtos/organizations/ListOrganizationsQueryDto.dto';
import { SearchOrganizationsRequestDto } from '@shared/dtos/organizations/SearchOrganizationsRequestDto.dto';
import { OrganizationResponseDto } from '@shared/dtos/organizations/OrganizationResponseDto.dto';
import { PaginatedResponse } from '@shared/models/PaginatedResponse';

/**
 * Organization REST API controller.
 * Provides full CRUD operations with pagination, filtering, and sorting support.
 *
 * Uses interface-based DI following .NET's approach of programming to interfaces.
 */
@ApiTags('organizations')
@ApiExtraModels(PaginatedResponse, OrganizationResponseDto)
@Controller('organizations')
export class OrganizationController {
  constructor(
    @Inject(IOrganizationServiceToken)
    private readonly _service: IOrganizationService,
    @Inject(ILoggerToken)
    private readonly _logger: ILogger,
  ) {}

  /**
   * Get paginated list of organizations with sorting (simple GET).
   * For advanced filtering, use POST /organizations/search instead.
   *
   * @param query - Query parameters (pageNumber, pageSize, sortColumns, sortDirections)
   * @returns Paginated response with organizations
   *
   * @example
   * GET /organizations?pageNumber=1&pageSize=10&sortColumns=name&sortDirections=asc
   */
  @Get()
  @ApiOperation({
    summary: 'Get paginated list of organizations (simple)',
    description:
      'Simple pagination and sorting. For advanced filtering, use POST /organizations/search',
  })
  @ApiOkResponse({
    description: 'Paginated list of organizations retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponse) },
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: getSchemaPath(OrganizationResponseDto) },
            },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid pagination parameters' })
  async list(
    @Query() query: ListOrganizationsQueryDto,
  ): Promise<PaginatedResponse<OrganizationResponseDto>> {
    // Convert simple DTO to search DTO (no filters)
    const searchDto: SearchOrganizationsRequestDto = {
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      sortColumns: query.sortColumns,
      sortDirections: query.sortDirections,
      filters: undefined, // No filters in simple GET
    };

    const result = await this._service.list(searchDto);
    this._logger.LogInfo('List organizations success', {
      count: result.items.length,
      totalCount: result.totalCount,
      pageNumber: result.pageNumber,
    });
    return result;
  }

  /**
   * Search organizations with advanced filtering (POST with JSON body).
   * Supports complex filter criteria that cannot be expressed in query params.
   *
   * @param body - Search request with filters
   * @returns Paginated response with filtered organizations
   *
   * @example
   * POST /organizations/search
   * Body: {
   *   "pageNumber": 1,
   *   "pageSize": 10,
   *   "filters": [
   *     { "propertyName": "name", "operator": "contains", "value": "Acme" }
   *   ]
   * }
   */
  @Post('search')
  @ApiOperation({
    summary: 'Search organizations with advanced filters',
    description:
      'Use this endpoint for complex search criteria with dynamic filters. Accepts full search parameters in JSON body.',
  })
  @ApiOkResponse({
    description:
      'Paginated list of filtered organizations retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponse) },
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: getSchemaPath(OrganizationResponseDto) },
            },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid search parameters or filters',
  })
  async search(
    @Body() body: SearchOrganizationsRequestDto,
  ): Promise<PaginatedResponse<OrganizationResponseDto>> {
    const result = await this._service.list(body);
    this._logger.LogInfo('Search organizations success', {
      count: result.items.length,
      totalCount: result.totalCount,
      pageNumber: result.pageNumber,
      filterCount: body.filters?.length || 0,
    });
    return result;
  }

  /**
   * Get single organization by ID.
   *
   * @param id - Organization UUID
   * @returns Organization details
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiOkResponse({
    description: 'Organization found',
    type: OrganizationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  async getById(@Param('id') id: string): Promise<OrganizationResponseDto> {
    const org = await this._service.getById(id);
    this._logger.LogInfo('Get organization by ID success', { orgId: id });
    return org;
  }

  /**
   * Create new organization.
   *
   * @param dto - Organization creation data
   * @returns Created organization
   */
  @Post()
  @ApiOperation({ summary: 'Create new organization' })
  @ApiCreatedResponse({
    description: 'Organization created successfully',
    type: OrganizationResponseDto,
  })
  @ApiConflictResponse({
    description: 'Organization with this name already exists',
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async create(
    @Body() dto: CreateOrganizationRequestDto,
  ): Promise<OrganizationResponseDto> {
    const org = await this._service.create(dto);
    this._logger.LogInfo('Create organization success', { orgId: org.id });
    return org;
  }

  /**
   * Update existing organization.
   *
   * @param id - Organization UUID
   * @param dto - Organization update data
   * @returns Updated organization
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update existing organization' })
  @ApiOkResponse({
    description: 'Organization updated successfully',
    type: OrganizationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  @ApiConflictResponse({ description: 'Organization name already exists' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationRequestDto,
  ): Promise<OrganizationResponseDto> {
    const org = await this._service.update(id, dto);
    this._logger.LogInfo('Update organization success', { orgId: id });
    return org;
  }

  /**
   * Delete organization.
   *
   * @param id - Organization UUID
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization' })
  @ApiNoContentResponse({ description: 'Organization deleted successfully' })
  @ApiNotFoundResponse({ description: 'Organization not found' })
  async delete(@Param('id') id: string): Promise<void> {
    await this._service.delete(id);
    this._logger.LogInfo('Delete organization success', { orgId: id });
  }
}
