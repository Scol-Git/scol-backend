import { ApiProperty } from '@nestjs/swagger';
import { UploadStatus } from '@shared/enums/UploadStatus.enum';

export class ConfirmApplicationDocumentUploadResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ enum: UploadStatus })
  status!: UploadStatus;
}
