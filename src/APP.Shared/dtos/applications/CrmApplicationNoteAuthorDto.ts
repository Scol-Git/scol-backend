import { ApiProperty } from '@nestjs/swagger';

export class CrmApplicationNoteAuthorDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Jane Counsellor', nullable: true })
  displayName!: string | null;
}
