import { Module } from '@nestjs/common';
import { BackblazeStorageService } from './backblaze/BackblazeStorageService';
import { IStorageService } from '@shared/tokens/injection.tokens';

/**
 * Storage Module (Infrastructure)
 *
 * Provides object storage abstraction (Backblaze B2).
 * Exports IStorageService for dependency injection.
 */
@Module({
  providers: [
    {
      provide: IStorageService,
      useClass: BackblazeStorageService,
    },
  ],
  exports: [IStorageService],
})
export class StorageModule {}
