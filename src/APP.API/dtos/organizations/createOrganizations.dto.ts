import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOrganizationRequestDto {
  @ApiProperty({ example: 'Azura' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateOrganizationResponseDto {
  id!: string;
  name!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
