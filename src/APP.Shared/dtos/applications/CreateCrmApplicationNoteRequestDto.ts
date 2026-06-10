import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCrmApplicationNoteRequestDto {
  @ApiProperty({
    description: 'Note description',
    example: 'Follow up with lead regarding missing transcript.',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description!: string;

  @ApiPropertyOptional({
    description: 'Whether the note is marked as resolved',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isResolved?: boolean;
}
