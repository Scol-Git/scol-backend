import { ApiProperty } from '@nestjs/swagger';
import { CrmApplicationNoteItemDto } from './CrmApplicationNoteItemDto';

export class GetCrmApplicationNotesResponseDto {
  @ApiProperty({ format: 'uuid' })
  applicationId!: string;

  @ApiProperty({ type: [CrmApplicationNoteItemDto] })
  notes!: CrmApplicationNoteItemDto[];
}
