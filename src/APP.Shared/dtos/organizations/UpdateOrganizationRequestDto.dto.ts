import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AutoMap } from '@automapper/classes';

/**
 * DTO for updating an existing organization.
 *
 * @example
 * PUT /organizations/:id
 * Body: { "name": "Updated Organization Name" }
 */
export class UpdateOrganizationRequestDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Updated Organization Name',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @AutoMap()
  name!: string;
}
