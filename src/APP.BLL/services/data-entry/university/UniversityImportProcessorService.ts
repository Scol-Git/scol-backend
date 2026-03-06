import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import type {
  CsvImportProcessor,
  CsvRow,
  CsvProcessingResult,
} from '../common/abstractions/CsvImportProcessor';
import { normalizeCsvRow } from './dto/UniversityCsvRow';
import { UniversityRowValidator } from './validators/UniversityRowValidator';
import { LocationResolverService } from './resolvers/LocationResolverService';
import { UniversityResolverService } from './resolvers/UniversityResolverService';
import { UniversityRowResultBuilder } from './builders/UniversityRowResultBuilder';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

const LOG_CONTEXT = '[BulkImport:University:Processor]';

@Injectable()
export class UniversityImportProcessorService implements CsvImportProcessor {
  constructor(
    private readonly validator: UniversityRowValidator,
    private readonly locationResolver: LocationResolverService,
    private readonly universityResolver: UniversityResolverService,
    private readonly resultBuilder: UniversityRowResultBuilder,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  async processRows(
    manager: EntityManager,
    rows: CsvRow[],
  ): Promise<CsvProcessingResult> {
    const universityRows = rows.map(normalizeCsvRow);
    const { valid, invalid: validationErrorRows } =
      this.validator.validateRows(universityRows);
    if (validationErrorRows.length > 0) {
      this.logger.info(
        `${LOG_CONTEXT} Validation: ${validationErrorRows.length} row(s) failed (required fields or format)`,
      );
    }
    const locationMaps = await this.locationResolver.resolveLocations(
      manager,
      valid,
    );
    const universityIdByKey = await this.universityResolver.upsertUniversities(
      manager,
      valid,
      locationMaps,
    );
    const { reviewedRows, errorRows: resolutionErrorRows } =
      this.resultBuilder.buildImportResults(
        valid,
        locationMaps,
        universityIdByKey,
      );
    this.logger.info(
      `${LOG_CONTEXT} Processed: ${reviewedRows.length} reviewed, ${resolutionErrorRows.length + validationErrorRows.length} errors`,
    );
    return {
      reviewedRows:
        reviewedRows as unknown as CsvProcessingResult['reviewedRows'],
      errorRows: [
        ...validationErrorRows,
        ...resolutionErrorRows,
      ] as unknown as CsvProcessingResult['errorRows'],
    };
  }
}
