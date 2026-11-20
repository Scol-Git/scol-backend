import { ApiProperty } from '@nestjs/swagger';
import { BulkImportListItemDto } from './BulkImportListItemDto';

export class BulkImportDetailResponseDto extends BulkImportListItemDto {
  @ApiProperty() fileSizeBytes!: number;
  @ApiProperty() skippedCount!: number;
  @ApiProperty() publishedCount!: number;
  @ApiProperty() processedRows!: number;
  @ApiProperty({ nullable: true, type: String }) failureReason!: string | null;
  @ApiProperty({ description: 'Drafts this batch currently owns (live count)' }) ownedDraftCount!: number;
  @ApiProperty() hasErrorsFile!: boolean;
  @ApiProperty({ description: 'false once files were deleted by the retention job' }) hasOriginalFile!: boolean;
  @ApiProperty({ nullable: true, type: String, description: 'When original.csv / errors.csv were permanently deleted' })
  filesDeletedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) startedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) publishedBy!: string | null;
}
