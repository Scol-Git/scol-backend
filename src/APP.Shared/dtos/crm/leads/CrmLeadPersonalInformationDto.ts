import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus } from '@shared/enums/crm/LeadStatus.enum';
import { CrmLeadTargetUniversityDto } from './CrmLeadTargetUniversityDto';

export class CrmLeadPersonalInformationDto {
  @ApiProperty({ format: 'uuid' })
  leadId!: string;

  @ApiProperty({ example: 'John Doe' })
  fullName!: string;

  @ApiPropertyOptional({ example: '01837917991', nullable: true })
  phoneNumber!: string | null;

  @ApiPropertyOptional({ example: 'john@example.com', nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ example: 'Dhaka, Bangladesh', nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ example: '2002-05-12', nullable: true })
  dateOfBirth!: string | null;

  @ApiPropertyOptional({
    enum: LeadStatus,
    example: LeadStatus.NewLead,
    nullable: true,
  })
  leadStatus!: LeadStatus | null;

  @ApiProperty({ type: [CrmLeadTargetUniversityDto] })
  targetUniversities!: CrmLeadTargetUniversityDto[];

  @ApiPropertyOptional({ example: '2026', nullable: true })
  joined!: string | null;

  @ApiPropertyOptional({ nullable: true })
  imageUrl!: string | null;
}
