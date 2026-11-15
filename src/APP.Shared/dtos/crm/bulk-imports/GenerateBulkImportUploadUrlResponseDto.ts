import { ApiProperty } from '@nestjs/swagger';

export class GenerateBulkImportUploadUrlResponseDto {
  @ApiProperty() batchId!: string;
  @ApiProperty({ description: 'Presigned PUT URL (valid 15 minutes)' }) uploadUrl!: string;
  @ApiProperty({ description: 'ISO date-time' }) expiresAt!: string;
}
