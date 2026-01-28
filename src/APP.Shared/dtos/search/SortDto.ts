import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

/**
 * Sort configuration
 */
export class SortDto {
  @ApiProperty({
    description: 'Field to sort by',
    example: 'tuitionFee',
    enum: ['tuitionFee', 'durationMonths', 'courseName', 'universityName', 'createdAt'],
  })
  @IsString()
  field!: string;

  @ApiProperty({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
  })
  @IsIn(['asc', 'desc'])
  order!: 'asc' | 'desc';
}
