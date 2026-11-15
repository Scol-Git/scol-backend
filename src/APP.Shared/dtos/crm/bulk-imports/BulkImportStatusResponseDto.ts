import { ApiProperty } from '@nestjs/swagger';
import { BulkImportStatus } from '@shared/enums/crm/BulkImportStatus.enum';

export class BulkImportStatusResponseDto {
  @ApiProperty() batchId!: string;
  @ApiProperty({ enum: BulkImportStatus }) status!: BulkImportStatus;
  @ApiProperty() totalRows!: number;
  @ApiProperty() processedRows!: number;
  @ApiProperty() createdCount!: number;
  @ApiProperty() updatedCount!: number;
  @ApiProperty() skippedCount!: number;
  @ApiProperty() errorCount!: number;
  @ApiProperty() warningCount!: number;
  @ApiProperty({ nullable: true, type: String }) failureReason!: string | null;
  @ApiProperty({ description: 'true when polling can stop' }) isFinal!: boolean;
}
