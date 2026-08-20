import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCrmUniversityStageFlowItemDto {
  @ApiProperty({
    format: 'uuid',
    description: 'UniApplicationStage.id for this university',
  })
  @IsUUID('4')
  stageId!: string;

  @ApiProperty({
    example: 1,
    description: '1-based display order for this stage',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  displayOrder!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isEnabled!: boolean;
}

export class UpdateCrmUniversityStageFlowRequestDto {
  @ApiProperty({
    type: [UpdateCrmUniversityStageFlowItemDto],
    description:
      'Full list of stages. Each entry must include stageId, displayOrder, and isEnabled.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateCrmUniversityStageFlowItemDto)
  stages!: UpdateCrmUniversityStageFlowItemDto[];
}
