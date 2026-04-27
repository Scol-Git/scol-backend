import { ApiProperty } from '@nestjs/swagger';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';

export class ChangeCrmApplicationDocumentStatusResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({
    enum: ApplicationDocumentStatus,
    example: ApplicationDocumentStatus.Verified,
  })
  currentStatus!: ApplicationDocumentStatus;

  @ApiProperty({
    enum: ApplicationDocumentStatus,
    example: ApplicationDocumentStatus.InProgress,
  })
  previousStatus!: ApplicationDocumentStatus;
}
