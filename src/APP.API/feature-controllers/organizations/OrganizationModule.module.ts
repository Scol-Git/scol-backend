import { Module } from '@nestjs/common';
import { OrganizationController } from './OrganizationController.controller';
import { OrganizationService } from '@bll/services/OrganizationService.service';
import { IOrganizationService } from '@shared/tokens/injection.tokens';

/**
 * Organization Feature Module
 *
 * Registers organization-related controllers and services.
 * No imports needed - uses @Global modules (ILogger, IMapper, DbContext).
 */
@Module({
  controllers: [OrganizationController],
  providers: [
    {
      provide: IOrganizationService,
      useClass: OrganizationService,
    },
  ],
})
export class OrganizationModule {}
