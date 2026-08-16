import { ApiProperty } from '@nestjs/swagger';

export class DeleteCrmApplicationNoteResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}
