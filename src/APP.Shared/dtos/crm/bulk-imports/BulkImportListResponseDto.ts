import { ApiProperty } from '@nestjs/swagger';
import { BulkImportListItemDto } from './BulkImportListItemDto';

export class BulkImportListResponseDto {
  @ApiProperty({ type: [BulkImportListItemDto] }) items!: BulkImportListItemDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
