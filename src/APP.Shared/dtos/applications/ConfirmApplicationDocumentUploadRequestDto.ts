import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsUUID } from 'class-validator';

export class ConfirmApplicationDocumentUploadRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsDefined()
  @IsUUID('4')
  @IsNotEmpty()
  documentId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsDefined()
  @IsUUID('4')
  @IsNotEmpty()
  documentVersionId!: string;
}
