import { ApiProperty } from '@nestjs/swagger';
import { CrmAcademicResultItemDto } from './CrmAcademicResultItemDto';

export class UpdateCrmLeadAcademicResultsResponseDto {
  @ApiProperty({ type: [CrmAcademicResultItemDto] })
  academicResults!: CrmAcademicResultItemDto[];
}
