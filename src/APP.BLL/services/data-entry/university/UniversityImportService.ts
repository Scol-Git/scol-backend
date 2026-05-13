import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  IFileStore as IFileStoreToken,
  UniversityImportConfig as UniversityImportConfigToken,
} from '@shared/tokens/injection.tokens';
import type { FileStore } from '../common/abstractions/FileStore';
import type { ImportResult } from '../common/abstractions/ImportResult';
import { CsvImportPipeline } from '../common/engine/CsvImportPipeline';
import { UniversityImportSchema } from './UniversityImportSchema';
import { UniversityImportProcessorService } from './UniversityImportProcessorService';
import type { UniversityImportConfig } from './UniversityImportConfig';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import {
  formatImportError,
  ImportErrorCode,
} from '../common/abstractions/ImportErrorCode';
import {
  emptyImportResult,
  formatImportTimestamp,
  MAX_CSV_IMPORT_BYTES,
} from '../common/importUtils';

const LOG_CONTEXT = '[BulkImport:University:Service]';

@Injectable()
export class UniversityImportService {
  constructor(
    @Inject(IFileStoreToken) private readonly fileStore: FileStore,
    private readonly pipeline: CsvImportPipeline,
    private readonly processor: UniversityImportProcessorService,
    @Inject(ILoggerToken) private readonly logger: ILogger,
    @Inject(UniversityImportConfigToken)
    private readonly config: UniversityImportConfig,
  ) {}

  async execute(): Promise<ImportResult> {
    const { folders, readinessSeconds, allowMultipleFiles } = this.config;
    const stagingFileEntries = await this.fileStore.listFiles(folders.staging);

    if (stagingFileEntries.length === 0) {
      this.logger.info(`${LOG_CONTEXT} No file in Staging; skipping import.`);
      return emptyImportResult(UniversityImportSchema);
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
      return emptyImportResult(UniversityImportSchema);
    }
    if (stagingFile.sizeBytes > MAX_CSV_IMPORT_BYTES) {
      const sizeMb = (stagingFile.sizeBytes / (1024 * 1024)).toFixed(1);
      const maxMb = (MAX_CSV_IMPORT_BYTES / (1024 * 1024)).toFixed(0);
      throw new BadRequestException(
        formatImportError(
          ImportErrorCode.INVALID_FORMAT,
          `CSV too large (${sizeMb} MB). Maximum allowed is ${maxMb} MB.`,
        ),
      );
    }

    this.logger.info(`${LOG_CONTEXT} Starting import: ${stagingFile.name}`);
    const csvText = await this.fileStore.readFile(stagingFile.path);

    const result = await this.pipeline.executeInTransaction(
      csvText,
      UniversityImportSchema,
      this.processor,
    );

    const importTimestamp = formatImportTimestamp();
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

    return result;
  }
}
