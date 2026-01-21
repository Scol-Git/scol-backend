import { Module } from '@nestjs/common';
import { EntityRelationshipDemoController } from './EntityRelationshipDemoController.controller';
import { EntityRelationshipDemoModule } from '@bll/services/demo/EntityRelationshipDemoModule.module';

/**
 * Demo Module (API)
 * 
 * Provides demo endpoints for testing entity relationships.
 */
@Module({
  imports: [EntityRelationshipDemoModule],
  controllers: [EntityRelationshipDemoController],
})
export class DemoModule {}
