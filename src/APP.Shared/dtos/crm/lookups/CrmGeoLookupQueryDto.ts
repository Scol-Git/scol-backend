import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CrmStatesQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  countryId!: string;
}

export class CrmCitiesQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  stateId!: string;
}
