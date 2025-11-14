import { Global, Module } from '@nestjs/common';
import { createMapper, Mapper } from '@automapper/core';
import { classes } from '@automapper/classes';

import { OrganizationMapper } from './mappers/OrganizationMapper.mapper';

import { MAPPER, IMapper } from './mapping.tokens';

// Create a single global mapper instance to be shared across all tokens.
// This ensures mappings configured in OrganizationMapper (using MAPPER)
// are also available when injecting IMapper in services.
const globalMapper: Mapper = createMapper({
  strategyInitializer: classes(),
});

const mapperFactory = {
  provide: MAPPER,
  useValue: globalMapper,
};

// Alias IMapper token to the same mapper instance registered under MAPPER.
// This avoids having two separate mapper instances without shared mappings.
const iMapperFactory = {
  provide: IMapper,
  useExisting: MAPPER,
};

/**
 * Global module for AutoMapper configuration.
 *
 * Registers both legacy MAPPER token and new IMapper token for backward compatibility.
 * New code should use IMapper from @shared/tokens/injection.tokens
 */
@Global()
@Module({
  providers: [
    mapperFactory, // Legacy MAPPER token (deprecated)
    iMapperFactory, // New IMapper token (recommended)
    OrganizationMapper,
  ],
  exports: [MAPPER, IMapper],
})
export class MappingModule {}
