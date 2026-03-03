import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload returned by POST /data-entry/csv/import.
 * Counts of rows successfully reviewed vs rows that failed validation.
 */
export class DataEntryImportResponseDto {
  @ApiProperty({
    description: 'Number of rows successfully processed (written to BulkImport/University/Reviewed/)',
    example: 42,
  })
  universityUpdated!: number;

  @ApiProperty({
    description: 'Number of rows that failed validation (written to BulkImport/University/Errors/)',
    example: 3,
  })
  errorsCount!: number;
}
