import { Injectable, Inject, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { UniversityCsvImportOrchestrator } from './university-import/UniversityCsvImportOrchestrator';

export interface DataEntryImportResult {
  reviewedCsv: Buffer;
  errorsCsv: Buffer;
  reviewedCount: number;
  errorsCount: number;
}

/**
 * Data entry service. University CSV import is triggered via importUniCsv();
 * it reads from BulkImport/University/Staging and writes to Reviewed/Errors/Archive.
 */
@Injectable()
export class DataEntryService {
  constructor(
    private readonly universityCsvImportOrchestrator: UniversityCsvImportOrchestrator,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  /**
   * Trigger university CSV import from Staging folder.
   * No request body; reads the single CSV in BulkImport/University/Staging.
   */
  async importUniCsv(): Promise<DataEntryImportResult> {
    try {
      const result = await this.universityCsvImportOrchestrator.execute();
      return {
        reviewedCsv: result.reviewedCsv,
        errorsCsv: result.errorsCsv,
        reviewedCount: result.reviewedCount,
        errorsCount: result.errorsCount,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      if (this.isCsvQuoteError(err)) {
        throw new BadRequestException(
          'Invalid CSV format (quote/parsing error). Check the file and try again.',
        );
      }
      this.logger.LogError('Uni CSV import failed', err as Error, {});
      throw new ServiceUnavailableException(
        'Service temporarily unavailable. Please try again later.',
      );
    }
  }

  private isCsvQuoteError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      msg.includes('Invalid Opening Quote') ||
      msg.includes('quote is found on field') ||
      msg.includes('INVALID_OPENING_QUOTE')
    );
  }
}
