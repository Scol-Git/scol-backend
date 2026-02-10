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
}
