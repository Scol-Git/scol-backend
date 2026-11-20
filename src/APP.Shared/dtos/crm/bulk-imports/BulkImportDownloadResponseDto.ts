import { ApiProperty } from '@nestjs/swagger';

export class BulkImportDownloadResponseDto {
  @ApiProperty() downloadUrl!: string;
  @ApiProperty({ description: 'ISO date-time' }) expiresAt!: string;
}
