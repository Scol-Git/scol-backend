import { Module } from '@nestjs/common';
import { DocumentService } from './DocumentService';
import { StorageModule } from '@infra/storage/StorageModule.module';

/**
 * Documents Module (BLL)
 *
 * Provides document upload/download business logic.
 * Uses StorageModule for presigned URLs (Backblaze B2).
 */
@Module({
  imports: [StorageModule],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentsModule {}
