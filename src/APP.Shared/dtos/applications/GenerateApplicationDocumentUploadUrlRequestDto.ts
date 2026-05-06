import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class GenerateApplicationDocumentUploadUrlRequestDto {
  @ApiProperty({ example: 'passport.pdf' })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiProperty({ example: 523423 })
  @IsDefined()
  @IsInt()
  @Min(1)
  fileSizeBytes!: number;
}
