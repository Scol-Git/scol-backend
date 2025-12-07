import { ApiProperty } from '@nestjs/swagger';
import { AutoMap } from '@automapper/classes';

export class OrganizationDto {
  @ApiProperty({ format: 'uuid' })
  @AutoMap()
  id!: string;

  @ApiProperty({ example: 'Acme Corp' })
  @AutoMap()
  name!: string;
}

