import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { EnglishTestInputDto } from '@shared/dtos/leads/EnglishTestInputDto';

export class UpdateCrmLeadEnglishTestResultsRequestDto {
  @ApiProperty({ type: [EnglishTestInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EnglishTestInputDto)
  englishTestResults!: EnglishTestInputDto[];
}
