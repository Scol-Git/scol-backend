import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CrmAcademicResultInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  degreeId!: string;

  @ApiProperty({ example: 'Example School' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  institute!: string;

  @ApiProperty({ example: 4.75 })
  @IsNumber()
  @Min(0)
  @Max(10)
  gpa!: number;

  @ApiProperty({ example: '2019-06-01' })
  @IsDateString()
  passingDate!: string;
}
