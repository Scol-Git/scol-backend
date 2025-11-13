import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import { AutoMap } from '@automapper/classes';

export class CreateOrganizationRequestDto {
  @ApiProperty({ example: 'Azura' })
  @IsString()
  @IsNotEmpty()
  @AutoMap()
  name!: string;
}
