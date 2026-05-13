import { ApiProperty } from '@nestjs/swagger';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';

/**
 * User slice in auth responses (login, verify-OTP, refresh).
 * Groups userId and academicFormStatus for client convenience.
 */
export class AuthResponseUserDto {
  @ApiProperty({
    description: 'User ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId!: string;

  @ApiProperty({
    description:
      'Academic form completion status (drives onboarding/eligibility UI).',
    enum: AcademicFormStatus,
  })
  academicFormStatus!: AcademicFormStatus;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  fullName?: string | null;

  @ApiProperty({
    description: 'User joined year',
    example: 2023,
  })
  joinedAt?: number | null;

  @ApiProperty({
    description: 'User image URL',
    example: 'https://example.com/image.jpg',
  })
  imgUrl?: string | null;
}
