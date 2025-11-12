import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AppLogger } from '@infra/logging/AppLogger.service';
import { OrganizationService } from '@bll/services/OrganizationService.service';
import {
  CreateOrganizationRequestDto,
  CreateOrganizationResponseDto,
} from '@api/dtos/organizations/createOrganizations.dto';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly orgs: OrganizationService,
    private readonly logger: AppLogger,
  ) {
    this.logger.LogInfo('OrgsController initialized');
  }

  @Get()
  async list(): Promise<CreateOrganizationResponseDto[]> {
    const items = await this.orgs.list();

    this.logger.LogInfo('List organizations success', { count: items.length });

    return items.map((o) => ({
      id: o.id,
      name: o.name,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));
  }

  @Post()
  async create(
    @Body() dto: CreateOrganizationRequestDto,
  ): Promise<CreateOrganizationResponseDto> {
    const org = await this.orgs.create(dto.name);
    this.logger.LogInfo('Create organization success', { orgId: org.id });
    return {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }
}
