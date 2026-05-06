import { ApiProperty } from '@nestjs/swagger';
import { ApplicationRequirementStatus } from '@shared/enums/ApplicationRequirementStatus.enum';

export class ChangeCrmApplicationRequirementStatusResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({
    enum: ApplicationRequirementStatus,
    example: ApplicationRequirementStatus.Pending,
  })
  currentStatus!: ApplicationRequirementStatus;

  @ApiProperty({
    enum: ApplicationRequirementStatus,
    example: ApplicationRequirementStatus.InProgress,
  })
  previousStatus!: ApplicationRequirementStatus;
}
