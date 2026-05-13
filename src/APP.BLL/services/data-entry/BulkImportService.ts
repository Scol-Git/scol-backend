import {
  Injectable,
  Inject,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { UniversityImportService } from './university/UniversityImportService';
import { CourseImportService } from './course/CourseImportService';

const CSV_QUOTE_ERROR_INDICATORS = [
  'Invalid Opening Quote',
  'quote is found on field',
  'INVALID_OPENING_QUOTE',
] as const;

export interface BulkImportResult {
  reviewedCsv: Buffer;
  errorsCsv: Buffer;
  reviewedCount: number;
  errorsCount: number;
}

@Injectable()
export class BulkImportService {
  constructor(
    private readonly universityImportService: UniversityImportService,
    private readonly courseImportService: CourseImportService,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  async importUniCsv(): Promise<BulkImportResult> {
    try {
      const result = await this.universityImportService.execute();
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

  async importCourseCsv(): Promise<BulkImportResult> {
    try {
      const result = await this.courseImportService.execute();
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
      this.logger.LogError('Course CSV import failed', err as Error, {});
      throw new ServiceUnavailableException(
        'Service temporarily unavailable. Please try again later.',
      );
    }
  }

  private isCsvQuoteError(err: unknown): boolean {
    const message = err instanceof Error ? err.message : String(err);
    return CSV_QUOTE_ERROR_INDICATORS.some((indicator) =>
      message.includes(indicator),
    );
  }
}
