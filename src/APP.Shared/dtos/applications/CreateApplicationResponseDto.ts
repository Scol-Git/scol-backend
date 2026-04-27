import { ApiProperty } from '@nestjs/swagger';

export class CreateApplicationResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({
    description: 'Created application ID',
    example: '550e8400-e29b-41d4-a716-446655440100',
  })
  applicationId!: string;
}

