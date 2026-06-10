import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CursorPaginationResponseDto } from '@shared/dtos/search/CursorPaginationDto';

class CrmLeadConsultantInfoDto {
  @ApiProperty({ format: 'uuid' })
  consultantId!: string;

  @ApiProperty({ example: 'Jane Counsellor' })
  name!: string;
}

class CrmLeadTargetCountryInfoDto {
  @ApiProperty({ format: 'uuid' })
  countryId!: string;

  @ApiProperty({ example: 'Canada' })
  name!: string;
}

export class CrmLeadListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ example: '01837917991' })
  phone!: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  email?: string;

  @ApiProperty({ example: 'NewLead' })
  leadStatus!: string;

  @ApiPropertyOptional({ type: CrmLeadConsultantInfoDto, nullable: true })
  consultantInfo!: CrmLeadConsultantInfoDto | null;

  @ApiPropertyOptional({ type: CrmLeadTargetCountryInfoDto, nullable: true })
  targetCountryInfo!: CrmLeadTargetCountryInfoDto | null;

  @ApiProperty({ example: 'Offline' })
  registerSource!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  registerDate!: Date;

  @ApiPropertyOptional({ example: 'Online', nullable: true })
  enrollmentStatus!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  enrollmentDate!: Date | null;

  @ApiPropertyOptional({ example: true, nullable: true })
  hasPassedEnglishTest!: boolean | null;
}

export class CrmLeadListResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Leads retrieved successfully' })
  message!: string;

  @ApiProperty({ type: CursorPaginationResponseDto })
  pagination!: CursorPaginationResponseDto;

  @ApiProperty({ type: [CrmLeadListItemDto] })
  leads!: CrmLeadListItemDto[];
}
