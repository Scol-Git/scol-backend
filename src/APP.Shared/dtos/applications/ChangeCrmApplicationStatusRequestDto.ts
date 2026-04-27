import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApplicationStatus } from '@shared/enums/ApplicationStatus.enum';

export class ChangeCrmApplicationStatusRequestDto {
  @ApiProperty({
    description: 'Target application status code',
    enum: ApplicationStatus,
    example: ApplicationStatus.OnHold,
  })
  @IsEnum(ApplicationStatus)
  toStatus!: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'Optional CRM remarks for the status change',
    example: 'Waiting for updated transcript.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
