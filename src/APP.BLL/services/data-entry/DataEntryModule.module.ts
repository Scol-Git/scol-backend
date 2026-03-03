import { Module } from '@nestjs/common';
import * as path from 'path';
import {
  IFileStore as IFileStoreToken,
  UniversityImportConfig as UniversityImportConfigToken,
} from '@shared/tokens/injection.tokens';
import { DataEntryService } from './DataEntryService';
import { LocalBulkImportFileStore } from './bulk-import/infrastructure/LocalBulkImportFileStore';
import { CsvImportExecutor } from './bulk-import/engine/CsvImportExecutor';
import { UniversityImportProcessor } from './university-import/UniversityImportProcessor';
import { UniversityCsvImportOrchestrator } from './university-import/UniversityCsvImportOrchestrator';
import { defaultUniversityImportConfig } from './university-import/UniversityImportConfig';

const defaultBasePath = path.join(process.cwd(), 'BulkImport', 'University');

@Module({
  providers: [
    {
      provide: IFileStoreToken,
      useFactory: () => {
        const basePath =
          process.env.BULK_IMPORT_UNIVERSITY_BASE_PATH ?? defaultBasePath;
        return new LocalBulkImportFileStore(basePath);
      },
    },
    {
      provide: UniversityImportConfigToken,
      useValue: defaultUniversityImportConfig,
    },
    UniversityImportProcessor,
    CsvImportExecutor,
    UniversityCsvImportOrchestrator,
    DataEntryService,
  ],
  exports: [DataEntryService],
})
export class DataEntryModule {}
