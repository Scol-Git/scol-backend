import { Module } from '@nestjs/common';
import { BackblazeStorageService } from './backblaze/BackblazeStorageService';
import { PublicAssetStorageService } from './backblaze/PublicAssetStorageService';
import { IStorageService } from '@shared/tokens/injection.tokens';

/**
 * Storage Module (Infrastructure)
 *
 * Provides object storage abstraction (Backblaze B2).
 * Exports IStorageService for the private scol-documents bucket and
 * PublicAssetStorageService for the public scol-assets bucket.
 */
@Module({
  providers: [
    {
      provide: IStorageService,
      useClass: BackblazeStorageService,
    },
    PublicAssetStorageService,
  ],
  exports: [IStorageService, PublicAssetStorageService],
})
export class StorageModule {}
