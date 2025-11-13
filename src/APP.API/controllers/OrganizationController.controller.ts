import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Logger } from '@infra/logging/Logger.service';
import { OrganizationsService } from '@bll/services/OrganizationService.service';
import { CreateOrganizationRequestDto } from '@shared/dtos/organizations/CreateOrganizationRequestDto.dto';
import { OrganizationResponseDto } from '@shared/dtos/organizations/OrganizationResponseDto.dto';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly _service: OrganizationsService,
    private readonly _logger: Logger,
  ) {}

  @Get()
  @ApiOkResponse({ type: OrganizationResponseDto, isArray: true })
  async list(): Promise<OrganizationResponseDto[]> {
    const items = await this._service.list();
    this._logger.LogInfo('List organizations success', { count: items.length });
    return items;
  }

  @Post()
  @ApiBody({ type: CreateOrganizationRequestDto })
  @ApiCreatedResponse({ type: OrganizationResponseDto })
  async create(
    @Body() dto: CreateOrganizationRequestDto,
  ): Promise<OrganizationResponseDto> {
    const org = await this._service.create(dto);
    this._logger.LogInfo('Create organization success', { orgId: org.id });
    return org;
  }
}
