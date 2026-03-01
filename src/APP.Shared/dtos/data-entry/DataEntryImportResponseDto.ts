import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload returned by POST /data-entry/csv/import.
 * Counts of rows successfully reviewed vs rows that failed validation.
 */
export class DataEntryImportResponseDto {
  @ApiProperty({
    description: 'Number of rows successfully processed (uni/city/state/country resolved, written to data/uni-reviewed.csv)',
    example: 42,
  })
  universityUpdated!: number;

  @ApiProperty({
    description: 'Number of rows that failed validation (written to data/uni-errors.csv)',
    example: 3,
  })
  errorsCount!: number;
}
