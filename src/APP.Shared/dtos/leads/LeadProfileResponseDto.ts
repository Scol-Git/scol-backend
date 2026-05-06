import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FieldDto {
  @ApiPropertyOptional()
  id?: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  value!: any;
}

export class SectionDto {
  @ApiProperty()
  sectionTitle!: string;

  @ApiProperty()
  isEditable!: boolean;

  @ApiPropertyOptional({ type: [FieldDto] })
  fields?: FieldDto[];
}

export class PersonalInformationSectionDto extends SectionDto {
  @ApiPropertyOptional()
  joined?: string;

  @ApiPropertyOptional()
  img_url?: string | null;
}

/**
 * Uploaded Document DTO
 */
export class UploadedDocumentDto {
  @ApiProperty()
  documentId!: string;

  @ApiPropertyOptional()
  fileName?: string;

  @ApiPropertyOptional()
  overallStatus?: string;
}

export class DocumentTypeDto {
  @ApiProperty()
  documentTypeId!: string;

  @ApiPropertyOptional()
  documentTypeCode?: string;

  @ApiPropertyOptional()
  documentTypeName?: string;
}
/**
 * Academic Record Item (ONE per document type)
 */
export class AcademicRecordItemDto {
  @ApiProperty({ type: DocumentTypeDto })
  documentType!: DocumentTypeDto;

  @ApiProperty({ type: [UploadedDocumentDto] })
  uploadedDocuments!: UploadedDocumentDto[];
}

/**
 * Academic Record Section
 */
export class AcademicRecordSectionDto extends SectionDto {
  @ApiProperty({ type: [AcademicRecordItemDto] })
  items!: AcademicRecordItemDto[];
}

export class LeadProfileResponseDto {
  @ApiProperty({ type: PersonalInformationSectionDto })
  personalInformation!: PersonalInformationSectionDto;

  @ApiProperty({ type: SectionDto })
  academicBackground!: SectionDto;

  @ApiProperty({ type: SectionDto })
  englishTestScore!: SectionDto;

  @ApiProperty({ type: SectionDto })
  contactInformation!: SectionDto;

  @ApiProperty({ type: AcademicRecordSectionDto })
  academicRecord!: AcademicRecordSectionDto;
}
