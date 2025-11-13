import { ApiProperty } from '@nestjs/swagger';
import { AutoMap } from '@automapper/classes';

export class OrganizationResponseDto {
  @ApiProperty({ format: 'uuid' })
  @AutoMap()
  id!: string;

  @ApiProperty({ example: 'Azura' })
  @AutoMap()
  name!: string;

}
