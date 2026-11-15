import { ApiProperty } from '@nestjs/swagger';

export class PublishCountsDto {
  @ApiProperty() intakes!: number;
  @ApiProperty() courses!: number;
  @ApiProperty() universities!: number;
  @ApiProperty() programmes!: number;
  @ApiProperty() countries!: number;
  @ApiProperty() states!: number;
  @ApiProperty() cities!: number;
}

export class BlockingIssueDto {
  @ApiProperty({ example: 'university' }) entity!: string;
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [String], description: 'CSV header names that must be filled in' })
  missingFields!: string[];
}

export class PublishPreviewResponseDto {
  @ApiProperty({ type: PublishCountsDto }) counts!: PublishCountsDto;
  @ApiProperty({ type: [BlockingIssueDto] }) blockingIssues!: BlockingIssueDto[];
  @ApiProperty() canPublish!: boolean;
}
