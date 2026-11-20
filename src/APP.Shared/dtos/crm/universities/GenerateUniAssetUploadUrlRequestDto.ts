import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { UniAssetKind } from '@shared/enums/crm/UniAssetKind.enum';

export const UNI_ASSET_MAX_BYTES = 5 * 1024 * 1024;
export const UNI_ASSET_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class GenerateUniAssetUploadUrlRequestDto {
  @ApiProperty({ enum: UniAssetKind })
  @IsEnum(UniAssetKind)
  kind!: UniAssetKind;

  @ApiProperty({ example: 'cover.jpg' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ enum: UNI_ASSET_MIME_TYPES })
  @IsIn(UNI_ASSET_MIME_TYPES)
  mimeType!: (typeof UNI_ASSET_MIME_TYPES)[number];

  @ApiProperty({ example: 120000, description: 'File size in bytes. Maximum 5 MB.' })
  @IsInt()
  @Min(1)
  @Max(UNI_ASSET_MAX_BYTES)
  fileSizeBytes!: number;
}
