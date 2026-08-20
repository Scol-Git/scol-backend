import { Module } from '@nestjs/common';
import { CrmUniversitiesModule as CrmUniversitiesBllModule } from '@bll/crm-services/universities/CrmUniversitiesModule.module';
import { CrmUniversitiesController } from './CrmUniversitiesController';

@Module({
  imports: [CrmUniversitiesBllModule],
  controllers: [CrmUniversitiesController],
})
export class CrmUniversitiesModule {}
