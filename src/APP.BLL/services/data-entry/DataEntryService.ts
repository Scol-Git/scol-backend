import { Injectable, Inject, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { UniversityCsvImportOrchestrator } from './university-import/UniversityCsvImportOrchestrator';

/** Substrings in error messages that indicate a CSV quote/parsing problem. */
const CSV_QUOTE_ERROR_INDICATORS = [
  'Invalid Opening Quote',
  'quote is found on field',
  'INVALID_OPENING_QUOTE',
] as const;

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
   * Reads the single CSV from Staging, runs university import, returns counts and CSV buffers.
   *
   * @returns Counts and buffers for reviewed and error rows (API does not return buffers).
   * @throws BadRequestException when CSV is invalid or staging rules are violated.
   * @throws ServiceUnavailableException when the operation fails transiently (e.g. DB unreachable).
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
      this.logger.LogError('University CSV import failed', err as Error, {});
      throw new ServiceUnavailableException(
        'Service temporarily unavailable. Please try again later.',
      );
    }
  }

  /** Returns true if the error message indicates a CSV quote/parsing issue. */
  private isCsvQuoteError(err: unknown): boolean {
    const message = err instanceof Error ? err.message : String(err);
    return CSV_QUOTE_ERROR_INDICATORS.some((indicator) => message.includes(indicator));
  }
}
