import { Module } from '@nestjs/common';
import * as path from 'path';
import {
  IFileStore as IFileStoreToken,
  UniversityImportConfig as UniversityImportConfigToken,
} from '@shared/tokens/injection.tokens';
import { BulkImportService } from './BulkImportService';
import { LocalFileStore } from './common/infrastructure/LocalFileStore';
import { CsvImportPipeline } from './common/engine/CsvImportPipeline';
import { UniversityImportProcessorService } from './university/UniversityImportProcessorService';
import { UniversityImportService } from './university/UniversityImportService';
import { UniversityRowValidator } from './university/validators/UniversityRowValidator';
import { LocationResolverService } from './university/resolvers/LocationResolverService';
import { UniversityResolverService } from './university/resolvers/UniversityResolverService';
import { UniversityRowResultBuilder } from './university/builders/UniversityRowResultBuilder';
import { defaultUniversityImportConfig } from './university/UniversityImportConfig';

const defaultBasePath = path.join(process.cwd(), 'BulkImport', 'University');

@Module({
  providers: [
    {
      provide: IFileStoreToken,
      useFactory: () => {
        const basePath =
          process.env.BULK_IMPORT_UNIVERSITY_BASE_PATH ?? defaultBasePath;
        return new LocalFileStore(basePath);
      },
    },
    {
      provide: UniversityImportConfigToken,
      useValue: defaultUniversityImportConfig,
    },
    UniversityRowValidator,
    LocationResolverService,
    UniversityResolverService,
    UniversityRowResultBuilder,
    UniversityImportProcessorService,
    CsvImportPipeline,
    UniversityImportService,
    BulkImportService,
  ],
  exports: [BulkImportService],
})
export class BulkImportModule {}
