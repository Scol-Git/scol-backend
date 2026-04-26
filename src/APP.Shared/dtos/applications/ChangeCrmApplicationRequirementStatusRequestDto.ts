import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApplicationRequirementStatus } from '@shared/enums/ApplicationRequirementStatus.enum';

export class ChangeCrmApplicationRequirementStatusRequestDto {
  @ApiProperty({
    enum: ApplicationRequirementStatus,
    example: ApplicationRequirementStatus.Pending,
  })
  @IsEnum(ApplicationRequirementStatus)
  toStatus!: ApplicationRequirementStatus;

  @ApiPropertyOptional({
    description: 'CRM remark for requirement status change',
    example:
      'The transcript was rejected. Please upload a clearer version.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
