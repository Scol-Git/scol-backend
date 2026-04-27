import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmUploadDto {
  @IsUUID('4', { message: 'versionId must be a valid UUID' })
  @ApiProperty({
    description: 'Document version ID returned from upload-url',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  versionId!: string;
}
