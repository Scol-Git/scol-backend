import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ChangeCrmLeadResultVerificationRequestDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isVerified!: boolean;
}
