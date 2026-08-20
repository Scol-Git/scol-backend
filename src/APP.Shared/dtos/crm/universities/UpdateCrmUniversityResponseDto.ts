import { ApiProperty } from '@nestjs/swagger';

export class UpdateCrmUniversityResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'University updated successfully' })
  message!: string;
}
