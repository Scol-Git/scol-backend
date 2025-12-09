import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginRequestDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail({}, { message: 'email must be a valid email if provided' })
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Email address (required if phone not provided)',
    example: 'admin@scol.com',
  })
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsPhoneNumber('BD', { message: 'phone must be a valid BD phone number if provided' })
  @IsOptional()
  @ApiPropertyOptional({
    description: 'BD phone (required if email not provided)',
    example: '01837917991',
  })
  phone?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  @ApiProperty({
    description: 'User password',
    example: 'SecureP@ss123',
    minLength: 8,
  })
  password!: string;
}

