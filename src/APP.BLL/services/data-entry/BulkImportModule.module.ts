import { Module } from '@nestjs/common';
import * as path from 'path';
import {
  IFileStore as IFileStoreToken,
  IFileStoreCourse as IFileStoreCourseToken,
  UniversityImportConfig as UniversityImportConfigToken,
  CourseImportConfig as CourseImportConfigToken,
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
import { CourseImportProcessorService } from './course/CourseImportProcessorService';
import { CourseImportService } from './course/CourseImportService';
import { CourseRowValidator } from './course/validators/CourseRowValidator';
import { defaultCourseImportConfig } from './course/CourseImportConfig';

const defaultBasePath = path.join(process.cwd(), 'BulkImport', 'University');
const defaultCourseBasePath = path.join(process.cwd(), 'BulkImport', 'Course');

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
    {
      provide: IFileStoreCourseToken,
      useFactory: () => {
        const basePath =
          process.env.BULK_IMPORT_COURSE_BASE_PATH ?? defaultCourseBasePath;
        return new LocalFileStore(basePath);
      },
    },
    {
      provide: CourseImportConfigToken,
      useValue: defaultCourseImportConfig,
    },
    CourseRowValidator,
    CourseImportProcessorService,
    CourseImportService,
    UniversityRowValidator,
    LocationResolverService,
    UniversityResolverService,
    UniversityRowResultBuilder,
    UniversityImportProcessorService,
    CsvImportPipeline,
    UniversityImportService,
    BulkImportService,
  ],
  exports: [BulkImportService, CourseImportService, UniversityImportService],
})
export class BulkImportModule {}
