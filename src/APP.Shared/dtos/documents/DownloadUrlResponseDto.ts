import { ApiProperty } from '@nestjs/swagger';

export class DownloadUrlResponseDto {
  @ApiProperty({
    description: 'Presigned URL for direct download from storage',
    example: 'https://s3.us-west-002.backblazeb2.com/bucket/documents/...',
  })
  url!: string;
}
