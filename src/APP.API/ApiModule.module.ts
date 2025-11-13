import { Module } from '@nestjs/common';

import { OrganizationController } from './controllers/OrganizationController.controller';
import { HealthController } from './controllers/HealthController.controller';

import { OrganizationsService } from '@bll/services/OrganizationService.service';

import { HttpExceptionFilter } from './filters/HttpExceptionFilter.filter';
import { InfrastructureModule } from '@infra/InfrastructureModule.module';
import { MappingModule } from '@bll/mappings/MappingModule.module';

@Module({
  imports: [
    InfrastructureModule, // ✅ registers DataSource + Logger (global)
    MappingModule, // ✅ registers MAPPER + OrganizationMapper (global)
  ],
  controllers: [OrganizationController, HealthController],
  providers: [OrganizationsService, HttpExceptionFilter],
})
export class ApiModule {}
