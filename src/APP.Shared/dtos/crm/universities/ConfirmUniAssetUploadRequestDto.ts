import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength } from 'class-validator';
import { UniAssetKind } from '@shared/enums/crm/UniAssetKind.enum';

export class ConfirmUniAssetUploadRequestDto {
  @ApiProperty({ enum: UniAssetKind })
  @IsEnum(UniAssetKind)
  kind!: UniAssetKind;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111/cover' })
  @IsString()
  @MaxLength(200)
  storageKey!: string;
}
