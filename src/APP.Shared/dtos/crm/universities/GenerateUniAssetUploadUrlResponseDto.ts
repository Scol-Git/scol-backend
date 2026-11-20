import { ApiProperty } from '@nestjs/swagger';

export class GenerateUniAssetUploadUrlHeadersDto {
  @ApiProperty({ example: 'image/jpeg' })
  'Content-Type'!: string;
}

export class GenerateUniAssetUploadUrlResponseDto {
  @ApiProperty({ description: 'Presigned PUT URL for the public scol-assets bucket' })
  uploadUrl!: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111/cover' })
  storageKey!: string;

  @ApiProperty({ type: GenerateUniAssetUploadUrlHeadersDto })
  headers!: GenerateUniAssetUploadUrlHeadersDto;

  @ApiProperty({ example: 900 })
  expiresInSeconds!: number;
}
