import { ApiProperty } from '@nestjs/swagger';

export class CrmUniversityListItemDto {
  @ApiProperty() uniId!: string;
  @ApiProperty() uniName!: string;
  @ApiProperty({ nullable: true, type: String }) countryName!: string | null;
  @ApiProperty({ nullable: true, type: String }) cityName!: string | null;
  @ApiProperty({ nullable: true, type: String }) logoUrl!: string | null;
  @ApiProperty() isPublished!: boolean;
  @ApiProperty({ nullable: true, type: String }) importBatchId!: string | null;
  @ApiProperty({ description: 'Intakes of the university (not deleted)' }) intakeCount!: number;
}

export class CrmUniversityListResponseDto {
  @ApiProperty({ type: [CrmUniversityListItemDto] }) items!: CrmUniversityListItemDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
