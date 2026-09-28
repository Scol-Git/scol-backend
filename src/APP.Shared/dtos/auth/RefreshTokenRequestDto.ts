import { IsNotEmpty, IsString } from 'class-validator';
import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  @AutoMap()
  @ApiProperty({
    description: 'Refresh token (JWT)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;
}
