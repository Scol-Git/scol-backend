import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { RegisterSource } from '@shared/enums/crm/RegisterSource.enum';
import { LeadStatus } from '@shared/enums/crm/LeadStatus.enum';

export class CreateCrmLeadRequestDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: '01837917991' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^01[3-9]\d{8}$/, {
    message: 'Invalid Bangladesh phone number format',
  })
  phone!: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '123 Main St, Anytown, USA' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 'Anytown' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  city?: string;

  @ApiPropertyOptional({ example: 'male' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gender?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  targetCountryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  consultantId?: string;

  @ApiPropertyOptional({
    enum: RegisterSource,
    example: RegisterSource.Offline,
  })
  @IsOptional()
  @IsEnum(RegisterSource)
  registerSource?: RegisterSource;

  @ApiPropertyOptional({ enum: LeadStatus, example: LeadStatus.NewLead })
  @IsOptional()
  @IsEnum(LeadStatus)
  leadStatus?: LeadStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  hasPassedEnglishTest?: boolean;
}
