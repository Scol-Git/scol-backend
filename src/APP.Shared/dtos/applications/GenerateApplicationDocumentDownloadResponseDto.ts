import { ApiProperty } from '@nestjs/swagger';

export class GenerateApplicationDocumentDownloadResponseDto {
  @ApiProperty()
  url!: string;

  @ApiProperty({ example: 3600 })
  expiresInSeconds!: number;

  @ApiProperty({ example: 'passport.pdf' })
  fileName!: string;
}
