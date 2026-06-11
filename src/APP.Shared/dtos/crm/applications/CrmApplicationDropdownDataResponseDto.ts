import { ApiProperty } from '@nestjs/swagger';

class CrmApplicationDropdownConsultantDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'John Doe' })
  name!: string;
}

export class CrmApplicationDropdownDataResponseDto {
  @ApiProperty({ type: [CrmApplicationDropdownConsultantDto] })
  consultantUsers!: CrmApplicationDropdownConsultantDto[];

  @ApiProperty({
    type: [String],
    example: [
      'IN_PROGRESS',
      'PENDING',
      'ON_HOLD',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
    ],
  })
  applicationStatuses!: string[];

  @ApiProperty({
    type: [String],
    example: [
      'REVIEW',
      'SUBMITTED',
      'CONDITIONAL',
      'UNCONDITIONAL',
      'INTERVIEW',
      'PAYMENT',
      'CAS_COE',
      'VISA',
      'ENROLLED',
      'COLLECT_COMMISSION',
      'COMPLETED',
    ],
  })
  applicationStages!: string[];
}
