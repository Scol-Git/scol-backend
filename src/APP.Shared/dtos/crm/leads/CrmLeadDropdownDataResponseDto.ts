import { ApiProperty } from '@nestjs/swagger';

class CrmLeadDropdownCountryDto {
  @ApiProperty({ format: 'uuid' })
  countryId!: string;

  @ApiProperty({ example: 'Canada' })
  countryName!: string;
}

class CrmLeadDropdownConsultantDto {
  @ApiProperty({ format: 'uuid' })
  consultantId!: string;

  @ApiProperty({ example: 'Jane Counsellor' })
  name!: string;
}

export class CrmLeadDropdownDataResponseDto {
  @ApiProperty({ type: [CrmLeadDropdownCountryDto] })
  targetCountries!: CrmLeadDropdownCountryDto[];

  @ApiProperty({ type: [CrmLeadDropdownConsultantDto] })
  consultantUsers!: CrmLeadDropdownConsultantDto[];

  @ApiProperty({ type: [String], example: ['Online', 'Offline', 'LoggedIn'] })
  registerSources!: string[];

  @ApiProperty({
    type: [String],
    example: ['NewLead', 'Eligible', 'NotEligible', 'Unreachable', 'Visited'],
  })
  leadStatuses!: string[];

  @ApiProperty({ type: [String], example: ['Online', 'Offline'] })
  enrollmentStatuses!: string[];
}
