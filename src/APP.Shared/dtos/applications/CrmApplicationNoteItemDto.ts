import { ApiProperty } from '@nestjs/swagger';
import { CrmApplicationNoteAuthorDto } from './CrmApplicationNoteAuthorDto';

export class CrmApplicationNoteItemDto {
  @ApiProperty({ format: 'uuid' })
  noteId!: string;

  @ApiProperty({ format: 'uuid' })
  applicationId!: string;

  @ApiProperty({
    example: 'Follow up with lead regarding missing transcript.',
  })
  description!: string;

  @ApiProperty({ example: false })
  isResolved!: boolean;

  @ApiProperty({ example: '2025-11-15T10:30:00.000Z', nullable: true })
  resolvedAt!: string | null;

  @ApiProperty({ type: CrmApplicationNoteAuthorDto, nullable: true })
  resolvedBy!: CrmApplicationNoteAuthorDto | null;

  @ApiProperty({ type: CrmApplicationNoteAuthorDto, nullable: true })
  createdBy!: CrmApplicationNoteAuthorDto | null;

  @ApiProperty({ example: '2025-11-15T10:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2025-11-15T10:30:00.000Z' })
  updatedAt!: string;
}
