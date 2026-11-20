import { Injectable } from '@nestjs/common';
import { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';

/** User input never goes into a storage key. */
@Injectable()
export class BulkImportStorageKeyBuilder {
  originalKey(type: BulkImportType, batchId: string): string {
    return `bulk-imports/${this.folder(type)}/${batchId}/original.csv`;
  }

  errorsKey(type: BulkImportType, batchId: string): string {
    return `bulk-imports/${this.folder(type)}/${batchId}/errors.csv`;
  }

  private folder(type: BulkImportType): string {
    return type === BulkImportType.UNIVERSITY ? 'universities' : 'courses';
  }
}
