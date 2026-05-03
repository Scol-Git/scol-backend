// TODO Sajed Work

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FieldDto {
  @ApiPropertyOptional()
  id?: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  value!: any;
}

//!  make another dto for the personal information section to include the dynamic extra fields like img_url and joined, or make the SectionDto more flexible to accommodate such fields without breaking the structure.
export class SectionDto {
  @ApiProperty()
  sectionTitle!: string;

  @ApiProperty()
  isEditable!: boolean;

  @ApiPropertyOptional({ type: [FieldDto] })
  fields?: FieldDto[];

  // ✅ add these
  joined?: string;
  img_url?: string | null;
  items?: any[];
}

export class LeadProfileResponseDto {
  @ApiProperty({ type: SectionDto })
  personalInformation!: SectionDto;

  @ApiProperty({ type: SectionDto })
  academicBackground!: SectionDto;

  @ApiProperty({ type: SectionDto })
  englishTestScore!: SectionDto;

  @ApiProperty({ type: SectionDto })
  contactInformation!: SectionDto;

  @ApiProperty({ type: SectionDto })
  academicRecord!: SectionDto;
}
