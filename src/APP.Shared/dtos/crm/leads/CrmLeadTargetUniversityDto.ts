import { ApiProperty } from '@nestjs/swagger';

export class CrmLeadTargetUniversityDto {
  @ApiProperty({ format: 'uuid' })
  universityId!: string;

  @ApiProperty({ example: 'Metropolitan University of Calgary' })
  universityName!: string;
}
