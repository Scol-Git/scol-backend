import { ApiProperty } from '@nestjs/swagger';
import { CrmStageFlowItemDto } from './CrmUniversityDetailsResponseDto';

export class CrmUniversityStageFlowResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Application stage flow updated successfully' })
  message!: string;

  @ApiProperty({ type: [CrmStageFlowItemDto] })
  customApplicationStageFlow!: CrmStageFlowItemDto[];
}
