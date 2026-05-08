import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  IFileStore as IFileStoreToken,
  UniversityImportConfig as UniversityImportConfigToken,
} from '@shared/tokens/injection.tokens';
import type { FileStore } from '../common/abstractions/FileStore';
import type { ImportResult } from '../common/abstractions/ImportResult';
import { CsvImportPipeline } from '../common/engine/CsvImportPipeline';
import { buildCsvBuffer } from '../common/engine/CsvWriter';
import { UniversityImportSchema } from './UniversityImportSchema';
import { UniversityImportProcessorService } from './UniversityImportProcessorService';
import type { UniversityImportConfig } from './UniversityImportConfig';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { createHash } from 'crypto';
import type { QueryRunner } from 'typeorm';
import {
  formatImportError,
  ImportErrorCode,
} from '../common/abstractions/ImportErrorCode';
import { ADVISORY_LOCK_BULK_IMPORT_UNIVERSITY } from '../common/infrastructure/advisoryLockKeys';

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
    private readonly db: AppDbContext,
  ) {}

  async execute(): Promise<ImportResult> {
    const lockRunner = await this.acquireLockRunner();
    if (!lockRunner) {
      throw new BadRequestException(
        formatImportError(
          ImportErrorCode.LOCK_NOT_ACQUIRED,
          'University CSV import is already in progress.',
        ),
      );
    }
    try {
      return await this.runImport();
    } finally {
      await this.releaseLockRunner(lockRunner);
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
    const importKey = this.computeImportKey(csvText, stagingFile.name);
    const markerDir = `${folders.archive}/idempotency`;
    await this.fileStore.ensureDir(markerDir);
    const alreadyImported = (await this.fileStore.listFiles(markerDir)).some(
      (f) => f.name === `${importKey}.done`,
    );
    if (alreadyImported) {
      this.logger.info(
        `${LOG_CONTEXT} Skipping duplicate import for ${stagingFile.name} (${importKey}).`,
      );
      return this.emptyResult();
    }
    const result = await this.pipeline.execute(
      csvText,
      UniversityImportSchema,
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
    await this.fileStore.writeFile(`${markerDir}/${importKey}.done`, archivePath);
    await this.fileStore.moveFile(stagingFile.path, archivePath);
    this.logger.info(
      `${LOG_CONTEXT} Archived ${stagingFile.name} to ${archivePath}`,
    );

    return result;
  }

  private emptyResult(): ImportResult {
    return {
      reviewedCsv: buildCsvBuffer([], UniversityImportSchema.reviewedHeaders),
      errorsCsv: buildCsvBuffer([], UniversityImportSchema.errorHeaders),
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

  private computeImportKey(csvText: string, fileName: string): string {
    return createHash('sha256')
      .update(`${fileName}\n${csvText}`)
      .digest('hex');
  }

  private async acquireLockRunner(): Promise<QueryRunner | null> {
    const runner = this.db.manager.connection.createQueryRunner();
    await runner.connect();
    const rows = await runner.query(
      'SELECT pg_try_advisory_lock($1::bigint) AS "locked"',
      [ADVISORY_LOCK_BULK_IMPORT_UNIVERSITY.toString()],
    );
    const locked = Boolean(rows?.[0]?.locked);
    if (!locked) {
      await runner.release();
      return null;
    }
    return runner;
  }

  private async releaseLockRunner(runner: QueryRunner): Promise<void> {
    try {
      await runner.query('SELECT pg_advisory_unlock($1::bigint)', [
        ADVISORY_LOCK_BULK_IMPORT_UNIVERSITY.toString(),
      ]);
    } finally {
      await runner.release();
    }
  }
}
