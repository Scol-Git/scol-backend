import { Module } from '@nestjs/common';
import { ApplicationsController } from './ApplicationsController';
import { ApplicationDocumentsController } from './ApplicationDocumentsController';
import { ApplicationsModule as ApplicationsBllModule } from '@bll/services/applications/ApplicationsModule.module';

@Module({
  imports: [ApplicationsBllModule],
  controllers: [ApplicationDocumentsController, ApplicationsController],
})
export class ApplicationsModule {}

