import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';

export class ChangeCrmApplicationDocumentStatusRequestDto {
  @ApiProperty({
    enum: ApplicationDocumentStatus,
    example: ApplicationDocumentStatus.Rejected,
  })
  @IsEnum(ApplicationDocumentStatus)
  toStatus!: ApplicationDocumentStatus;

  @ApiPropertyOptional({
    description: 'CRM remark for document status change',
    example:
      'The transcript is blurry and unreadable. Please upload a clearer version.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
