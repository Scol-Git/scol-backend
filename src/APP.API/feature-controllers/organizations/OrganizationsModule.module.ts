import { Module } from '@nestjs/common';
import { OrganizationsController } from './OrganizationsController.controller';

@Module({
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}

