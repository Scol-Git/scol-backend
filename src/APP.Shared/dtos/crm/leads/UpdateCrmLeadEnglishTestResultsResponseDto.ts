import { ApiProperty } from '@nestjs/swagger';
import { CrmEnglishTestResultItemDto } from './CrmEnglishTestResultItemDto';

export class UpdateCrmLeadEnglishTestResultsResponseDto {
  @ApiProperty({ type: [CrmEnglishTestResultItemDto] })
  englishTestResults!: CrmEnglishTestResultItemDto[];
}
