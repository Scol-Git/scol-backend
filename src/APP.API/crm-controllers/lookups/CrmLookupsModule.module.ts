import { Module } from '@nestjs/common';
import { CrmLookupsModule as CrmLookupsBllModule } from '@bll/crm-services/lookups/CrmLookupsModule.module';
import { CrmLookupsController } from './CrmLookupsController';

@Module({
  imports: [CrmLookupsBllModule],
  controllers: [CrmLookupsController],
})
export class CrmLookupsModule {}
