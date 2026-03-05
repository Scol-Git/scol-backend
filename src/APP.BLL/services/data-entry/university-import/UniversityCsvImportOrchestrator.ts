/**
 * Orchestrates university CSV import: staging checks, execution, writing Reviewed/Errors CSVs, archiving input.
 */

import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  IFileStore as IFileStoreToken,
  UniversityImportConfig as UniversityImportConfigToken,
} from '@shared/tokens/injection.tokens';
import type { IFileStore } from '../bulk-import/abstractions/FileStore.interface';
import type { ImportResult } from '../bulk-import/abstractions/ImportResult';
import { CsvImportExecutor } from '../bulk-import/engine/CsvImportExecutor';
import { buildCsvBuffer } from '../bulk-import/engine/CsvWriter';
import { UniversityCsvImportSchema } from './UniversityCsvSchema';
import { UniversityImportProcessor } from './UniversityImportProcessor';
import type { UniversityImportConfig } from './UniversityImportConfig';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/** Log prefix for bulk import orchestrator (grep-friendly). */
const LOG_CONTEXT = '[BulkImport:University:Orchestrator]';

@Injectable()
export class UniversityCsvImportOrchestrator {
  private isRunning = false;

  constructor(
    @Inject(IFileStoreToken) private readonly fileStore: IFileStore,
    private readonly executor: CsvImportExecutor,
    private readonly processor: UniversityImportProcessor,
    @Inject(ILoggerToken) private readonly logger: ILogger,
    @Inject(UniversityImportConfigToken) private readonly config: UniversityImportConfig,
  ) {}

  /**
   * Runs one university CSV import from Staging: validates file count and readiness, executes pipeline, writes outputs, archives file.
   *
   * @returns Import result with reviewed/error CSV buffers and counts; empty result if no file or file not ready.
   * @throws BadRequestException when import already running, or multiple files in Staging when not allowed.
   */
  async execute(): Promise<ImportResult> {
    if (this.isRunning) {
      throw new BadRequestException('University CSV import is already in progress.');
    }
    this.isRunning = true;
    try {
      return await this.runImport();
    } finally {
      this.isRunning = false;
    }
  }

  /** Performs staging list, readiness check, executor run, write outputs, archive. */
  private async runImport(): Promise<ImportResult> {
    const { folders, readinessSeconds, allowMultipleFiles } = this.config;
    const stagingFileEntries = await this.fileStore.listFiles(folders.staging);

    if (stagingFileEntries.length === 0) {
      this.logger.info(`${LOG_CONTEXT} No file in Staging; skipping import.`);
      return this.emptyResult();
    }

    if (!allowMultipleFiles && stagingFileEntries.length > 1) {
      const fileNames = stagingFileEntries.map((fileEntry) => fileEntry.name).join(', ');
      throw new BadRequestException(
        `Exactly one CSV file is allowed in Staging. Found: ${stagingFileEntries.length} (${fileNames})`,
      );
    }

    const [stagingFile] = stagingFileEntries;
    const fileAgeSeconds = (Date.now() - stagingFile.lastModified.getTime()) / 1000;
    if (fileAgeSeconds < readinessSeconds) {
      this.logger.info(
        `${LOG_CONTEXT} File ${stagingFile.name} last modified ${fileAgeSeconds.toFixed(1)}s ago; ` +
          `waiting for ${readinessSeconds}s readiness. Skipping.`,
      );
      return this.emptyResult();
    }

    this.logger.info(`${LOG_CONTEXT} Starting university import from Staging: ${stagingFile.name}`);
    const csvText = await this.fileStore.readFile(stagingFile.path);

    const result = await this.executor.execute(
      csvText,
      UniversityCsvImportSchema,
      this.processor,
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
    this.logger.info(`${LOG_CONTEXT} Archived ${stagingFile.name} to ${archivePath}`);

    return result;
  }

  private emptyResult(): ImportResult {
    return {
      reviewedCsv: buildCsvBuffer([], UniversityCsvImportSchema.reviewedHeaders),
      errorsCsv: buildCsvBuffer([], UniversityCsvImportSchema.errorHeaders),
      reviewedCount: 0,
      errorsCount: 0,
    };
  }

  /** Returns a compact timestamp for filenames (e.g. 20260305T143022). */
  private formatImportTimestamp(): string {
    return new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .slice(0, 15);
  }
}
