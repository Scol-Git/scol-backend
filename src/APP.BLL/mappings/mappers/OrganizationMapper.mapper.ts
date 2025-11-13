// src/APP.API/mappings/mappers/OrganizationMappers.mapper.ts
import { Inject, Injectable } from '@nestjs/common';
import { createMap } from '@automapper/core';
import type { Mapper } from '@automapper/core';

import { MAPPER } from '../mapping.tokens';

import { Organization } from '@entity/entities/Organization.entity';
import { OrganizationResponseDto } from '@shared/dtos/organizations/OrganizationResponseDto.dto';
import { CreateOrganizationRequestDto } from '@shared/dtos/organizations/CreateOrganizationRequestDto.dto';

@Injectable()
export class OrganizationMapper {
  constructor(@Inject(MAPPER) mapper: Mapper) {
    // Entity -> DTO
    createMap(mapper, Organization, OrganizationResponseDto);
    // Create DTO -> Entity (if you need it later)
    createMap(mapper, CreateOrganizationRequestDto, Organization);
  }
}
