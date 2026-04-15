import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class IntakeDto {
  @ApiProperty({ description: 'Intake month (1-12)', example: 9 })
  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(12)
  intakeMonth!: number;

  @ApiProperty({ description: 'Intake year', example: 2026 })
  @IsDefined()
  @IsInt()
  @Min(2000)
  @Max(2100)
  intakeYear!: number;
}

export class CreateApplicationRequestDto {
  @ApiProperty({
    description: 'University ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsDefined()
  @IsUUID('4')
  @IsNotEmpty()
  universityId!: string;

  @ApiProperty({
    description: 'Course ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsDefined()
  @IsUUID('4')
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty({
    description: 'Selected intake information',
    type: IntakeDto,
  })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => IntakeDto)
  intake!: IntakeDto;
}

