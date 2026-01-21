import { Module } from '@nestjs/common';
import { EntityRelationshipDemoService } from './EntityRelationshipDemoService.service';

/**
 * Entity Relationship Demo Module
 * 
 * Provides a demo service that demonstrates:
 * - One-to-One relationships (user.leadProfile)
 * - One-to-Many relationships (lead.preferredPrograms - returns array)
 * - Many-to-One relationships (lead.country)
 * - Nested relationships and eager loading
 */
@Module({
  providers: [EntityRelationshipDemoService],
  exports: [EntityRelationshipDemoService],
})
export class EntityRelationshipDemoModule {}
