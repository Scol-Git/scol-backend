import { ApiProperty } from '@nestjs/swagger';

export class CrmApplicationActivityActorDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Jane Counsellor', nullable: true })
  displayName!: string | null;
}
