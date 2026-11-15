import { ApiProperty } from '@nestjs/swagger';
import { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';
import { BulkImportStatus } from '@shared/enums/crm/BulkImportStatus.enum';

export class BulkImportUploaderDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class BulkImportListItemDto {
  @ApiProperty() batchId!: string;
  @ApiProperty({ enum: BulkImportType }) type!: BulkImportType;
  @ApiProperty({ enum: BulkImportStatus }) status!: BulkImportStatus;
  @ApiProperty() fileName!: string;
  @ApiProperty() totalRows!: number;
  @ApiProperty() createdCount!: number;
  @ApiProperty() updatedCount!: number;
  @ApiProperty() errorCount!: number;
  @ApiProperty() warningCount!: number;
  @ApiProperty({ type: BulkImportUploaderDto }) uploadedBy!: BulkImportUploaderDto;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ nullable: true, type: String }) processedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) publishedAt!: string | null;
}
