import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'login' })
  action!: string;

  @ApiProperty({ example: '01711111111' })
  phone!: string;

  @ApiProperty({ example: 'verified', enum: ['verified', 'not_verified'] })
  accountStatus!: 'verified' | 'not_verified';

  @ApiProperty({ example: 'jwt-access-token' })
  accessToken!: string;

  @ApiProperty({ example: 'jwt-refresh-token' })
  refreshToken!: string;

  @ApiProperty({ example: 'Action completed.' })
  message!: string;

  @ApiProperty({ example: '2025-12-07T19:45:00.000Z' })
  timestamp!: string;

  @ApiProperty({
    required: false,
    example: '2025-12-07T21:45:00.000Z',
    description: 'When verification window expires (for not_verified).',
  })
  verificationExpiresAt?: string;
}

