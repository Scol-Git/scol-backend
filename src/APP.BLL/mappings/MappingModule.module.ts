import { Global, Module } from '@nestjs/common';
import { createMapper, Mapper } from '@automapper/core';
import { classes } from '@automapper/classes';

import { OrganizationMapper } from './mappers/OrganizationMapper.mapper';

import { MAPPER } from './mapping.tokens';

const mapperFactory = {
  provide: MAPPER,
  useFactory: (): Mapper => {
    // one global mapper instance
    const mapper = createMapper({
      strategyInitializer: classes(),
    });
    return mapper;
  },
};

@Global()
@Module({
  providers: [mapperFactory, OrganizationMapper],
  exports: [MAPPER],
})
export class MappingModule {}
