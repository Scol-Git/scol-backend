import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { DataSource as DbContext } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

import type { Mapper } from '@automapper/core';
import { MAPPER } from '@bll/mappings/mapping.tokens';
import { CreateOrganizationRequestDto } from '@shared/dtos/organizations/CreateOrganizationRequestDto.dto';
import { OrganizationResponseDto } from '@shared/dtos/organizations/OrganizationResponseDto.dto';

import { Organization } from '@entity/entities/Organization.entity';
import { Logger } from '@infra/logging/Logger.service';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectDataSource() private readonly _dbContext: DbContext,
    private readonly _logger: Logger,
    @Inject(MAPPER) private readonly mapper: Mapper,
  ) {}

  async list(): Promise<OrganizationResponseDto[]> {
    this._logger.LogInfo('Listing organizations');

    const repo = this._dbContext.getRepository(Organization);
    const entities = await repo.find({ order: { createdAt: 'DESC' } });

    return this.mapper.mapArray(
      entities,
      Organization,
      OrganizationResponseDto,
    );
  }

  async create(
    dto: CreateOrganizationRequestDto,
  ): Promise<OrganizationResponseDto> {
    const repo = this._dbContext.getRepository(Organization);

    const exists = await repo.findOne({ where: { name: dto.name } });
    if (exists) {
      this._logger.LogWarning('Organization already exists', {
        name: dto.name,
      });
      throw new ConflictException('Organization already exists');
    }

    const org = repo.create({ name: dto.name });
    await repo.save(org);

    this._logger.LogInfo('Organization created', {
      orgId: org.id,
      name: org.name,
    });

    return this.mapper.map(org, Organization, OrganizationResponseDto);
  }
}
