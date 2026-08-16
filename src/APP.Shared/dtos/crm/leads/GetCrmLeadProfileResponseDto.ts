import { ApiProperty } from '@nestjs/swagger';
import { ApplicationListItemDto } from '@shared/dtos/applications/ApplicationListItemDto';
import { CrmAcademicResultItemDto } from './CrmAcademicResultItemDto';
import { CrmEnglishTestResultItemDto } from './CrmEnglishTestResultItemDto';
import { CrmLeadApplicationSharedDocumentsDto } from './CrmLeadApplicationSharedDocumentsDto';
import { CrmLeadPersonalInformationDto } from './CrmLeadPersonalInformationDto';

export class GetCrmLeadProfileResponseDto {
  @ApiProperty({ type: CrmLeadPersonalInformationDto })
  personalInformation!: CrmLeadPersonalInformationDto;

  @ApiProperty({ type: [CrmAcademicResultItemDto] })
  academicResults!: CrmAcademicResultItemDto[];

  @ApiProperty({ type: [CrmEnglishTestResultItemDto] })
  englishTestResults!: CrmEnglishTestResultItemDto[];

  @ApiProperty({ type: CrmLeadApplicationSharedDocumentsDto })
  applicationSharedDocuments!: CrmLeadApplicationSharedDocumentsDto;

  @ApiProperty({ type: [ApplicationListItemDto] })
  applicationJourney!: ApplicationListItemDto[];
}
