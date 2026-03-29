import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  IFileStoreCourse as IFileStoreCourseToken,
  CourseImportConfig as CourseImportConfigToken,
} from '@shared/tokens/injection.tokens';
import type { FileStore } from '../common/abstractions/FileStore';
import type { ImportResult } from '../common/abstractions/ImportResult';
import { CsvImportPipeline } from '../common/engine/CsvImportPipeline';
import { buildCsvBuffer } from '../common/engine/CsvWriter';
import { CourseImportSchema } from './CourseImportSchema';
import { CourseImportProcessorService } from './CourseImportProcessorService';
import type { CourseImportConfig } from './CourseImportConfig';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

const LOG_CONTEXT = '[BulkImport:Course:Service]';

@Injectable()
export class CourseImportService {
  private isRunning = false;

  constructor(
    @Inject(IFileStoreCourseToken) private readonly fileStore: FileStore,
    private readonly pipeline: CsvImportPipeline,
    private readonly processor: CourseImportProcessorService,
    @Inject(ILoggerToken) private readonly logger: ILogger,
    @Inject(CourseImportConfigToken)
    private readonly config: CourseImportConfig,
  ) {}

  async execute(): Promise<ImportResult> {
    if (this.isRunning) {
      throw new BadRequestException(
        'Course CSV import is already in progress.',
      );
    }
    this.isRunning = true;
    try {
      return await this.runImport();
    } finally {
      this.isRunning = false;
    }
  }

  private async runImport(): Promise<ImportResult> {
    const { folders, readinessSeconds, allowMultipleFiles } = this.config;
    const stagingFileEntries = await this.fileStore.listFiles(folders.staging);

    if (stagingFileEntries.length === 0) {
      this.logger.info(`${LOG_CONTEXT} No file in Staging; skipping import.`);
      return this.emptyResult();
    }

    if (!allowMultipleFiles && stagingFileEntries.length > 1) {
      const fileNames = stagingFileEntries.map((e) => e.name).join(', ');
      throw new BadRequestException(
        `Exactly one CSV file is allowed in Staging. Found: ${stagingFileEntries.length} (${fileNames})`,
      );
    }

    const [stagingFile] = stagingFileEntries;
    const fileAgeSeconds =
      (Date.now() - stagingFile.lastModified.getTime()) / 1000;
    if (fileAgeSeconds < readinessSeconds) {
      this.logger.info(
        `${LOG_CONTEXT} File ${stagingFile.name} not ready (${fileAgeSeconds.toFixed(1)}s < ${readinessSeconds}s). Skipping.`,
      );
      return this.emptyResult();
    }

    this.logger.info(`${LOG_CONTEXT} Starting import: ${stagingFile.name}`);
    const csvText = await this.fileStore.readFile(stagingFile.path);
    const result = await this.pipeline.execute(
      csvText,
      CourseImportSchema,
      this.processor,
      { wrapInTransaction: false },
    );

    const importTimestamp = this.formatImportTimestamp();
    await this.fileStore.ensureDir(folders.reviewed);
    await this.fileStore.ensureDir(folders.errors);
    await this.fileStore.writeFile(
      `${folders.reviewed}/reviewed_${importTimestamp}.csv`,
      result.reviewedCsv,
    );
    await this.fileStore.writeFile(
      `${folders.errors}/errors_${importTimestamp}.csv`,
      result.errorsCsv,
    );

    const archivePath = `${folders.archive}/${importTimestamp}_${stagingFile.name}`;
    await this.fileStore.ensureDir(folders.archive);
    await this.fileStore.moveFile(stagingFile.path, archivePath);
    this.logger.info(
      `${LOG_CONTEXT} Archived ${stagingFile.name} to ${archivePath}`,
    );
    this.logger.info(
      `${LOG_CONTEXT} Summary: ${result.reviewedCount} reviewed, ${result.errorsCount} errors`,
    );

    return result;
  }

  private emptyResult(): ImportResult {
    return {
      reviewedCsv: buildCsvBuffer([], CourseImportSchema.reviewedHeaders),
      errorsCsv: buildCsvBuffer([], CourseImportSchema.errorHeaders),
      reviewedCount: 0,
      errorsCount: 0,
    };
  }

  private formatImportTimestamp(): string {
    return new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .slice(0, 15);
  }
}
