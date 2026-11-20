import { ApiProperty } from '@nestjs/swagger';
import { BulkImportStatus } from '@shared/enums/crm/BulkImportStatus.enum';

export class ConfirmBulkImportUploadResponseDto {
  @ApiProperty() batchId!: string;
  @ApiProperty({ enum: BulkImportStatus }) status!: BulkImportStatus;
}
