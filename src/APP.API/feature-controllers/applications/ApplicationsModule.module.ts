import { Module } from '@nestjs/common';
import { ApplicationsController } from './ApplicationsController';
import { ApplicationsModule as ApplicationsBllModule } from '@bll/services/applications/ApplicationsModule.module';

@Module({
  imports: [ApplicationsBllModule],
  controllers: [ApplicationsController],
})
export class ApplicationsModule {}

