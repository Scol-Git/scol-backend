import { ApiProperty } from '@nestjs/swagger';

export class ConfirmUniAssetUploadResponseDto {
  @ApiProperty({ nullable: true })
  coverImageUrl!: string | null;

  @ApiProperty({ nullable: true })
  logoUrl!: string | null;
}
