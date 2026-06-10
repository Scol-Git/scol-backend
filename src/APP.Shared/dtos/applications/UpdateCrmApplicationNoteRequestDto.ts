import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCrmApplicationNoteRequestDto {
  @ApiPropertyOptional({
    description: 'Updated note description',
    example: 'Transcript received and verified.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the note is marked as resolved',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isResolved?: boolean;
}
