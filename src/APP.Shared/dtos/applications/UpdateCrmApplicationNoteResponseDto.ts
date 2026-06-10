import { ApiProperty } from '@nestjs/swagger';
import { CrmApplicationNoteItemDto } from './CrmApplicationNoteItemDto';

export class UpdateCrmApplicationNoteResponseDto {
  @ApiProperty({ type: CrmApplicationNoteItemDto })
  note!: CrmApplicationNoteItemDto;
}
