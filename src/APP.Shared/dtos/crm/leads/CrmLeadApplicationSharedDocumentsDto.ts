import { ApiProperty } from '@nestjs/swagger';
import { AcademicRecordItemDto } from '@shared/dtos/leads/LeadProfileResponseDto';

export class CrmLeadApplicationSharedDocumentsDto {
  @ApiProperty({ type: [AcademicRecordItemDto] })
  items!: AcademicRecordItemDto[];
}
