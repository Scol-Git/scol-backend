import { ApiProperty } from '@nestjs/swagger';
import { CrmApplicationNoteItemDto } from './CrmApplicationNoteItemDto';

export class CreateCrmApplicationNoteResponseDto {
  @ApiProperty({ type: CrmApplicationNoteItemDto })
  note!: CrmApplicationNoteItemDto;
}
