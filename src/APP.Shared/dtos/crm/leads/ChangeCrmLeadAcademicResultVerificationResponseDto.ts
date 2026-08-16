import { ApiProperty } from '@nestjs/swagger';

export class ChangeCrmLeadAcademicResultVerificationResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ format: 'uuid' })
  degreeId!: string;

  @ApiProperty({ example: false })
  previousIsVerified!: boolean;

  @ApiProperty({ example: true })
  isVerified!: boolean;
}
