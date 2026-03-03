import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  IFileStore as IFileStoreToken,
  UniversityImportConfig as UniversityImportConfigToken,
} from '@shared/tokens/injection.tokens';
import type { IFileStore } from '../bulk-import/abstractions/IFileStore';
import type { ImportResult } from '../bulk-import/abstractions/ImportResult';
import { CsvImportExecutor } from '../bulk-import/engine/CsvImportExecutor';
import { buildCsvBuffer } from '../bulk-import/engine/CsvWriter';
import { UniversityCsvImportSchema } from './UniversityImportContract';
import { UniversityImportProcessor } from './UniversityImportProcessor';
import type { UniversityImportConfig } from './UniversityImportConfig';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

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

  private async runImport(): Promise<ImportResult> {
    const { folders, readinessSeconds, allowMultipleFiles } = this.config;
    const entries = await this.fileStore.listFiles(folders.staging);

    if (entries.length === 0) {
      this.logger.info('[Data Entry] No file in Staging; skipping import.');
      return this.emptyResult();
    }

    if (!allowMultipleFiles && entries.length > 1) {
      const fileNames = entries.map((e) => e.name).join(', ');
      throw new BadRequestException(
        `Exactly one CSV file is allowed in Staging. Found: ${entries.length} (${fileNames})`,
      );
    }

    const [entry] = entries;
    const ageSec = (Date.now() - entry.lastModified.getTime()) / 1000;
    if (ageSec < readinessSeconds) {
      this.logger.info(
        `[Data Entry] File ${entry.name} last modified ${ageSec.toFixed(1)}s ago; ` +
          `waiting for ${readinessSeconds}s readiness. Skipping.`,
      );
      return this.emptyResult();
    }

    this.logger.info(`[Data Entry] Starting university import from Staging: ${entry.name}`);
    const csvText = await this.fileStore.readFile(entry.path);

    const result = await this.executor.execute(
      csvText,
      UniversityCsvImportSchema,
      this.processor,
    );

    const ts = this.timestamp();
    await this.fileStore.ensureDir(folders.reviewed);
    await this.fileStore.ensureDir(folders.errors);
    await this.fileStore.writeFile(
      `${folders.reviewed}/reviewed_${ts}.csv`,
      result.reviewedCsv,
    );
    await this.fileStore.writeFile(
      `${folders.errors}/errors_${ts}.csv`,
      result.errorsCsv,
    );

    const archivePath = `${folders.archive}/${ts}_${entry.name}`;
    await this.fileStore.ensureDir(folders.archive);
    await this.fileStore.moveFile(entry.path, archivePath);
    this.logger.info(`[Data Entry] Archived ${entry.name} to ${archivePath}`);

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

  private timestamp(): string {
    return new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .slice(0, 15);
  }
}
