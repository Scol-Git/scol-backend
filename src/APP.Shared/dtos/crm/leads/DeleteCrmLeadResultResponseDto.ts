import { ApiProperty } from '@nestjs/swagger';

export class DeleteCrmLeadResultResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}
