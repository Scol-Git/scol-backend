import { Module } from '@nestjs/common';
import { CrmLookupsService } from './CrmLookupsService';

@Module({
  providers: [CrmLookupsService],
  exports: [CrmLookupsService],
})
export class CrmLookupsModule {}
