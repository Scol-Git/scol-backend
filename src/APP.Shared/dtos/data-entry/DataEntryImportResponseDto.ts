import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Payload returned by `POST /data-entry/import/university` and `POST /data-entry/import/course`.
 * Counts of rows successfully reviewed vs rows that failed validation.
 */
export class DataEntryImportResponseDto {
  @ApiPropertyOptional({
    description:
      'Number of university rows successfully processed (BulkImport/University/Reviewed/) — university import only',
    example: 42,
  })
  universityUpdated?: number;

  @ApiPropertyOptional({
    description:
      'Number of course rows successfully processed (BulkImport/Course/Reviewed/) — course import only',
    example: 40,
  })
  coursesUpdated?: number;

  @ApiProperty({
    description:
      'Number of rows that failed validation (Errors CSV for the import that ran)',
    example: 3,
  })
  errorsCount!: number;
}
