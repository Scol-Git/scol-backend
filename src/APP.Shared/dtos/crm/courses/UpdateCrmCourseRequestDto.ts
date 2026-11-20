import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommissionType } from '@shared/enums/CommissionType.enum';
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
import { MetaDataItemDto } from '@shared/dtos/common/MetaDataItemDto';

/** Fields that map onto UniCourses. */
export const COURSE_UPDATABLE_FIELDS = [
  'courseName',
  'sysProgrammeId',
  'sysDegreeId',
  'minSysDegreeId',
  'minGpa',
  'higherSysDegreeId',
  'higherGpa',
  'externalUrl',
  'requirementMetaData',
] as const;

/** Fields that map onto UniCourseIntakes. */
export const INTAKE_UPDATABLE_FIELDS = [
  'intakeMonth',
  'intakeYear',
  'courseDuration',
  'applicationDeadline',
  'tuitionFee',
  'currency',
  'initialDeposit',
  'initialDepositType',
  'applicationFee',
  'isActive',
  'intakeMetaData',
  'feesMetaData',
  'scholarshipMetaData',
] as const;

export type CourseUpdatableField = (typeof COURSE_UPDATABLE_FIELDS)[number];
export type IntakeUpdatableField = (typeof INTAKE_UPDATABLE_FIELDS)[number];

/**
 * Flat PATCH body for CRM course update.
 * Route :courseId is UniCourseIntakes.id; body fields split across UniCourses + UniCourseIntakes.
 */
export class UpdateCrmCourseRequestDto {
  // ── UniCourses ────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'MSc Computer Science' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  courseName?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  sysProgrammeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  sysDegreeId?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  minSysDegreeId?: string | null;

  @ApiPropertyOptional({ example: '3.00', nullable: true })
  @IsOptional()
  @IsNumberString()
  minGpa?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  higherSysDegreeId?: string | null;

  @ApiPropertyOptional({ example: '3.50', nullable: true })
  @IsOptional()
  @IsNumberString()
  higherGpa?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  externalUrl?: string | null;

  @ApiPropertyOptional({ type: [MetaDataItemDto], nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaDataItemDto)
  requirementMetaData?: MetaDataItemDto[] | null;

  // ── UniCourseIntakes ──────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 9, minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  intakeMonth?: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  intakeYear?: number;

  @ApiPropertyOptional({ example: 12, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseDuration?: number | null;

  @ApiPropertyOptional({
    example: '30-06-2026',
    nullable: true,
    description: 'DD-MM-YYYY. Null clears the deadline.',
  })
  @IsOptional()
  @Validate(DmyDateConstraint)
  applicationDeadline?: string | null;

  @ApiPropertyOptional({ example: '24500.00', nullable: true })
  @IsOptional()
  @IsNumberString()
  tuitionFee?: string | null;

  @ApiPropertyOptional({ example: 'GBP', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string | null;

  @ApiPropertyOptional({ example: '5000.00', nullable: true })
  @IsOptional()
  @IsNumberString()
  initialDeposit?: string | null;

  @ApiPropertyOptional({ example: 'AMOUNT', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  initialDepositType?: string | null;

  @ApiPropertyOptional({ example: '50.00', nullable: true })
  @IsOptional()
  @IsNumberString()
  applicationFee?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [MetaDataItemDto], nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaDataItemDto)
  intakeMetaData?: MetaDataItemDto[] | null;

  @ApiPropertyOptional({ type: [MetaDataItemDto], nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaDataItemDto)
  feesMetaData?: MetaDataItemDto[] | null;

  @ApiPropertyOptional({ type: [MetaDataItemDto], nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetaDataItemDto)
  scholarshipMetaData?: MetaDataItemDto[] | null;

  // ── CourseIntakeScholarships (one row per intake; not a column on the intake) ──

  @ApiPropertyOptional({ nullable: true, example: 'International Scholarship' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  scholarshipName?: string | null;

  @ApiPropertyOptional({ enum: CommissionType, nullable: true })
  @IsOptional()
  @IsEnum(CommissionType)
  scholarshipType?: CommissionType | null;

  @ApiPropertyOptional({ example: '5000.00', nullable: true })
  @IsOptional()
  @IsNumberString()
  scholarshipAmount?: string | null;

  // ── CourseEngReq (IELTS / PTE / TOEFL) ─────────────────────────────────────
  // Same field names as the course CSV. Sent overall+section together from CRM.
  // overall=null clears that test's requirement.

  @ApiPropertyOptional({ example: '6.00', nullable: true })
  @IsOptional()
  @IsNumberString()
  ieltsMinOverall?: string | null;

  @ApiPropertyOptional({ example: '5.50', nullable: true })
  @IsOptional()
  @IsNumberString()
  ieltsMinSection?: string | null;

  @ApiPropertyOptional({ example: '59.00', nullable: true })
  @IsOptional()
  @IsNumberString()
  pteMinOverall?: string | null;

  @ApiPropertyOptional({ example: '59.00', nullable: true })
  @IsOptional()
  @IsNumberString()
  pteMinSection?: string | null;

  @ApiPropertyOptional({ example: '4.50', nullable: true })
  @IsOptional()
  @IsNumberString()
  toeflMinOverall?: string | null;

  @ApiPropertyOptional({ example: '4.00', nullable: true })
  @IsOptional()
  @IsNumberString()
  toeflMinSection?: string | null;
}
