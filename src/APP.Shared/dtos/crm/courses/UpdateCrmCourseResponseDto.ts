import { ApiProperty } from '@nestjs/swagger';

export class UpdateCrmCourseResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Course updated successfully' })
  message!: string;
}
