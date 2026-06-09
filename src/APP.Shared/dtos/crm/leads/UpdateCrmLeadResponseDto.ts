import { ApiProperty } from '@nestjs/swagger';

export class UpdateCrmLeadResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Lead updated successfully' })
  message!: string;
}
