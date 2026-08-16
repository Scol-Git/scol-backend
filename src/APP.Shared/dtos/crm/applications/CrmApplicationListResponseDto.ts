import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CursorPaginationResponseDto } from '@shared/dtos/search/CursorPaginationDto';

class CrmApplicationLeadInfoDto {
  @ApiProperty({ format: 'uuid' })
  leadId!: string;

  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiPropertyOptional({ example: 'john.doe@email.com' })
  email?: string;

  @ApiProperty({ example: '01837917991' })
  phone!: string;
}

class CrmApplicationUniversityCourseInfoDto {
  @ApiProperty({ format: 'uuid' })
  UniCourseId!: string;

  @ApiProperty({ example: 'University of Oxford' })
  Uniname!: string;

  @ApiProperty({ example: 'BSc Computer Science' })
  Coursename!: string;
}

class CrmApplicationConsultantInfoDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Alice Green' })
  name!: string;
}

export class CrmApplicationListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: CrmApplicationLeadInfoDto })
  leadInfo!: CrmApplicationLeadInfoDto;

  @ApiProperty({ type: CrmApplicationUniversityCourseInfoDto })
  universityCourseInfo!: CrmApplicationUniversityCourseInfoDto;

  @ApiPropertyOptional({ type: CrmApplicationConsultantInfoDto, nullable: true })
  consultantInfo!: CrmApplicationConsultantInfoDto | null;

  @ApiProperty({ type: String, format: 'date', example: '2026-01-01' })
  applicationDate!: string;

  @ApiProperty({ example: 'IN_PROGRESS' })
  applicationStatus!: string;

  @ApiProperty({ example: 'REVIEW' })
  applicationStage!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-01-01' })
  lastupdateDate!: string;
}

export class CrmApplicationListStatisticsDto {
  @ApiProperty({ example: 120 })
  totalApplications!: number;

  @ApiProperty({ example: 15 })
  pendingReview!: number;

  @ApiProperty({ example: 80 })
  applicationSubmitted!: number;

  @ApiProperty({ example: 25 })
  pendingDocuments!: number;
}

export class CrmApplicationListResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Application list fetched successfully' })
  message!: string;

  @ApiProperty({ type: CursorPaginationResponseDto })
  pagination!: CursorPaginationResponseDto;

  @ApiProperty({ type: CrmApplicationListStatisticsDto })
  statistics!: CrmApplicationListStatisticsDto;

  @ApiProperty({ type: [CrmApplicationListItemDto] })
  applications!: CrmApplicationListItemDto[];
}
