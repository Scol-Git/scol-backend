import { Module } from '@nestjs/common';
import { CrmUniversitiesModule as CrmUniversitiesBllModule } from '@bll/crm-services/universities/CrmUniversitiesModule.module';
import { CrmPublishingModule } from '@bll/crm-services/publishing/CrmPublishingModule.module';
import { CrmUniversitiesController } from './CrmUniversitiesController';

@Module({
  imports: [CrmUniversitiesBllModule, CrmPublishingModule],
  controllers: [CrmUniversitiesController],
})
export class CrmUniversitiesModule {}
