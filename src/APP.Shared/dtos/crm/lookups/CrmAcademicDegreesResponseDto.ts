import { ApiProperty } from '@nestjs/swagger';

export class CrmAcademicDegreeItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'HSC' })
  degreeName!: string;

  @ApiProperty({ example: 2, nullable: true })
  levelOrder!: number | null;

  @ApiProperty({ example: '4.00', nullable: true, type: String })
  gpaScale!: string | null;
}

export class CrmAcademicDegreesResponseDto {
  @ApiProperty({ type: [CrmAcademicDegreeItemDto] })
  degrees!: CrmAcademicDegreeItemDto[];
}
