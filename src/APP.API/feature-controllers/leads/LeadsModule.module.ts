import { Module } from '@nestjs/common';
import { LeadsProfileController } from './LeadsProfileController.controller';
import { LeadsModule as LeadsBllModule } from '@bll/services/leads/LeadsModule.module';

/**
 * Leads API Module
 *
 * Provides lead profile endpoints.
 * Imports LeadsModule from BLL for business logic.
 */
@Module({
  imports: [LeadsBllModule],
  controllers: [LeadsProfileController],
})
export class LeadsModule {}
