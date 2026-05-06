import { ApiProperty } from '@nestjs/swagger';

export class ApplicationUploadedDocumentDto {
  @ApiProperty({ format: 'uuid' })
  applicationDocumentId!: string;

  @ApiProperty({ example: 'BSC-transcript.pdf', nullable: true })
  fileName!: string | null;

  @ApiProperty({ example: 'SATISFIED', nullable: true })
  overallStatus!: string | null;
}
