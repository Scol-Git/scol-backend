import { Module } from '@nestjs/common';
import { InfrastructureModule } from '@infra/infrastructure.module';

import { OrganizationController } from './controllers/OrganizationController.controller';
import { OrganizationService } from '@bll/services/OrganizationService.service';
import { HealthController } from './controllers/health.controller';

@Module({
  imports: [InfrastructureModule],
  controllers: [OrganizationController, HealthController],
  providers: [OrganizationService],
})
export class ApiModule {}
