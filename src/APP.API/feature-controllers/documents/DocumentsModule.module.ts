import { Module } from '@nestjs/common';
import { DocumentsController } from './DocumentsController.controller';
import { DocumentsModule as DocumentsBllModule } from '@bll/services/documents/DocumentsModule.module';

/**
 * Documents API Module
 *
 * Provides document upload (presigned URL) and download endpoints.
 * No dependency on Application or Lead modules.
 */
@Module({
  imports: [DocumentsBllModule],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
