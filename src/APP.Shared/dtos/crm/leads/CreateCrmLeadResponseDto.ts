import { ApiProperty } from '@nestjs/swagger';

class NewLeadInfoDto {
  @ApiProperty({ example: '01837917991' })
  phone!: string;

  @ApiProperty({ example: 'TempP@ss123' })
  password!: string;
}

export class CreateCrmLeadResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Lead created successfully' })
  message!: string;

  @ApiProperty({ type: NewLeadInfoDto })
  newLeadInfo!: NewLeadInfoDto;
}
