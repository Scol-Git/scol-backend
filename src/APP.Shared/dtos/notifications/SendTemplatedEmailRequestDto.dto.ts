/**
 * DTO for sending templated email requests
 *
 * @class SendTemplatedEmailRequestDto
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsObject } from 'class-validator';

export class SendTemplatedEmailRequestDto {
  @ApiProperty({
    description: 'Recipient email address',
    example: 'user@example.com',
  })
  @IsEmail()
  to!: string;

  @ApiProperty({
    description: 'Template identifier',
    example: 'welcome',
    enum: ['welcome', 'organization-created'],
  })
  @IsString()
  templateId!: string;

  @ApiProperty({
    description: 'Template data/variables',
    example: { userName: 'John Doe', organizationName: 'Acme Corp' },
  })
  @IsObject()
  data!: Record<string, any>;
}
