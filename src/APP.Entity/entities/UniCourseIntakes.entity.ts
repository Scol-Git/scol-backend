import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { UniCourses } from './UniCourses.entity';
import { CourseIntakeScholarships } from './CourseIntakeScholarships.entity';

/**
 * @class UniCourseIntakes
 * @extends {BaseEntity}
 *
 * **Search Indexes:**
 * - isActive: Filters active courses (most queries)
 * - uniCourseId: FK join to UniCourses
 * - intakeKey: Computed key (year*12+month) for efficient intake filtering
 * - intakeYear: Year filtering (legacy support)
 * - courseDuration: Duration range queries
 * - createdAt: Default sorting (newest first)
 * - Composite (isActive, createdAt): Common query pattern
 * - Composite (uniCourseId, intakeKey): Search pipeline intake filtering
 * - Composite (isActive, intakeKey): Active intake filtering
 * - Partial (id, uniCourseId, intakeYear WHERE isActive = true AND deletedAt IS NULL):
 *   Optimized for active course queries (10-20% faster base filtering)
 */
@Entity('UniCourseIntakes')
@Index('IX_UniCourseIntakes_isActive', ['isActive'])
@Index('IX_UniCourseIntakes_uniCourseId', ['uniCourseId'])
@Index('IX_UniCourseIntakes_intakeKey', ['intakeKey'])
@Index('IX_UniCourseIntakes_uniCourseId_intakeKey', ['uniCourseId', 'intakeKey'])
@Index('IX_UniCourseIntakes_isActive_intakeKey', ['isActive', 'intakeKey'])
@Index('IX_UniCourseIntakes_intakeYear', ['intakeYear'])
@Index('IX_UniCourseIntakes_courseDuration', ['courseDuration'])
@Index('IX_UniCourseIntakes_createdAt', ['createdAt'])
@Index('IX_UniCourseIntakes_active_createdAt', ['isActive', 'createdAt'])
@Index('IX_UniCourseIntakes_active_only', ['id', 'uniCourseId', 'intakeYear'], {
  where: '"isActive" = true AND "deletedAt" IS NULL',
})
export class UniCourseIntakes extends BaseEntity {
  @Column({
    name: 'uniCourseId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  uniCourseId!: string;

  @Column({
    name: 'intakeMonth',
    type: 'int',
    nullable: false,
  })
  @AutoMap()
  intakeMonth!: number;

  @Column({
    name: 'intakeYear',
    type: 'int',
    nullable: false,
  })
  @AutoMap()
  intakeYear!: number;

  @Column({
    name: 'intakeKey',
    type: 'int',
    nullable: false,
    generatedType: 'STORED',
    asExpression: '"intakeYear" * 12 + "intakeMonth"',
  })
  @AutoMap()
  intakeKey!: number;

  @Column({
    name: 'courseDuration',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  courseDuration?: number;

  @Column({
    name: 'applicationDeadline',
    type: 'date',
    nullable: true,
  })
  @AutoMap()
  applicationDeadline?: Date;

  @Column({
    name: 'tuitionFee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  tuitionFee?: string;

  @Column({
    name: 'currency',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  @AutoMap()
  currency?: string;

  @Column({
    name: 'initialDeposit',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  initialDeposit?: string;

  @Column({
    name: 'applicationFee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  applicationFee?: string;

  @Column({
    name: 'isActive',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  @AutoMap()
  isActive!: boolean;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: University course
   * Each course intake belongs to one course
   */
  @ManyToOne(() => UniCourses, (course) => course.UniCourseIntake)
  @JoinColumn({ name: 'uniCourseId' })
  UniCourse!: UniCourses;

  /**
   * One-to-Many: Scholarships
   * A course intake can have multiple scholarships
   */
  @OneToMany(
    () => CourseIntakeScholarships,
    (scholarship) => scholarship.UniCourseIntake,
    { cascade: true },
  )
  CourseIntakeScholarship!: CourseIntakeScholarships[];
}
