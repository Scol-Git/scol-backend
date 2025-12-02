import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Firebase Verify Phone Request DTO
 * 
 * Used for phone number verification via Firebase.
 * The client sends the Firebase ID token received after phone OTP verification.
 */
export class FirebaseVerifyPhoneRequestDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Firebase ID token received from Firebase after phone OTP verification (includes phone_number)',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}

