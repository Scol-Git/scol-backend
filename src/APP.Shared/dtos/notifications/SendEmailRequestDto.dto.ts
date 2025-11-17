/**
 * DTO for sending email requests
 *
 * @class SendEmailRequestDto
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class SendEmailRequestDto {
  @ApiProperty({
    description: 'Recipient email address',
    example: 'user@example.com',
  })
  @IsEmail()
  to!: string;

  @ApiProperty({
    description: 'Email subject',
    example: 'Welcome to SCOL',
  })
  @IsString()
  subject!: string;

  @ApiProperty({
    description: 'Email body content',
    example: 'Welcome to our platform!',
  })
  @IsString()
  body!: string;

  @ApiProperty({
    description: 'Whether the body is HTML content',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isHtml?: boolean;
}
