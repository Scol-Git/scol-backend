import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumberString,
  IsOptional,
  Max,
  Min,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
  type ValidationArguments,
} from 'class-validator';
import { isDmyDate } from '@shared/utils/dmyDate';

@ValidatorConstraint({ name: 'dmyDate', async: false })
class DmyDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isDmyDate(value);
  }

  defaultMessage(): string {
    return 'date must be DD-MM-YYYY';
  }
}

@ValidatorConstraint({ name: 'intakeFeeFields', async: false })
class IntakeFeeFieldsConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const body = args.object as UpdateIntakeFeesRequestDto;
    return body.applicationDeadline !== undefined || body.applicationFee !== undefined;
  }

  defaultMessage(): string {
    return 'applicationDeadline or applicationFee is required';
  }
}

export class UpdateIntakeFeesRequestDto {
  @ApiProperty({ example: 9, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  @Validate(IntakeFeeFieldsConstraint)
  intakeMonth!: number;

  @ApiProperty({ example: 2027 })
  @Type(() => Number)
  @IsInt()
  intakeYear!: number;

  @ApiPropertyOptional({
    example: '30-06-2027',
    nullable: true,
    description: 'DD-MM-YYYY. Null clears the deadline. Omit to leave it unchanged.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @Validate(DmyDateConstraint)
  applicationDeadline?: string | null;

  @ApiPropertyOptional({
    example: '75.00',
    nullable: true,
    description: 'Plain decimal. Null clears the fee. Omit to leave it unchanged.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsNumberString()
  applicationFee?: string | null;
}
