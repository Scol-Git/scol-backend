import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApplicationStage } from '@shared/enums/ApplicationStage.enum';

export class ChangeCrmApplicationStageRequestDto {
  @ApiProperty({
    description: 'Target application stage code',
    enum: ApplicationStage,
    example: ApplicationStage.Submitted,
  })
  @IsEnum(ApplicationStage)
  toStage!: ApplicationStage;

  @ApiPropertyOptional({
    description: 'Optional CRM remarks for the stage change',
    example: 'Application submitted to university.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
