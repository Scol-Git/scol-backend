import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Firebase Login Request DTO
 * 
 * Used for Google authentication via Firebase.
 * The client sends the Firebase ID token received after Google sign-in.
 */
export class FirebaseLoginRequestDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Firebase ID token received from Firebase after Google authentication',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}

