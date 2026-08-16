import { ApiProperty } from '@nestjs/swagger';

export class ChangeCrmLeadEnglishTestResultVerificationResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ format: 'uuid' })
  testId!: string;

  @ApiProperty({ example: false })
  previousIsVerified!: boolean;

  @ApiProperty({ example: true })
  isVerified!: boolean;
}
