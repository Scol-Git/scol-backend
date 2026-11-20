import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

import { MetaDataItem } from '@shared/types/MetaDataItem.type';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { UniCourses } from './UniCourses.entity';
import { CourseIntakeScholarships } from './CourseIntakeScholarships.entity';
import { Applications } from './Applications.entity';
import { LeadFavouriteCourses } from './LeadFavouriteCourses.entity';

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
// Natural-key unique index and draft index live in migration bulk-import-indexes.
// synchronize: false stops typeorm:gen from dropping them.
@Entity('UniCourseIntakes')
@Index('UQ_UniCourseIntakes_course_year_month', { synchronize: false })
@Index('IX_UniCourseIntakes_drafts', { synchronize: false })
@Index('IX_UniCourseIntakes_isActive', ['isActive'])
@Index('IX_UniCourseIntakes_uniCourseId', ['uniCourseId'])
@Index('IX_UniCourseIntakes_intakeKey', ['intakeKey'])
@Index('IX_UniCourseIntakes_uniCourseId_intakeKey', ['uniCourseId', 'intakeKey'])
@Index('IX_UniCourseIntakes_isActive_intakeKey', ['isActive', 'intakeKey'])
@Index('IX_UniCourseIntakes_intakeYear', ['intakeYear'])
@Index('IX_UniCourseIntakes_courseDuration', ['courseDuration'])
@Index('IX_UniCourseIntakes_createdAt', ['createdAt'])
@Index('IX_UniCourseIntakes_active_createdAt', ['isActive', 'createdAt'])
@Index('IX_UniCourseIntakes_live', ['id', 'uniCourseId', 'intakeYear'], {
  where: '"isActive" = true AND "isPublished" = true AND "deletedAt" IS NULL',
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
    name: 'initialDepositType',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  initialDepositType?: string;

  @Column({ name: 'intakeMetaData', type: 'jsonb', nullable: true })
  @AutoMap()
  intakeMetaData?: MetaDataItem[];

  @Column({ name: 'feesMetaData', type: 'jsonb', nullable: true })
  @AutoMap()
  feesMetaData?: MetaDataItem[];

  @Column({ name: 'scholarshipMetaData', type: 'jsonb', nullable: true })
  @AutoMap()
  scholarshipMetaData?: MetaDataItem[];

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
  // Publish / import tracking (bulk import draft -> publish)
  // ========================================

  @Column({ name: 'isPublished', type: 'boolean', nullable: false, default: true })
  @AutoMap()
  isPublished!: boolean;

  @Column({ name: 'publishedAt', type: 'timestamptz', nullable: true })
  @AutoMap()
  publishedAt?: Date | null;

  @Column({ name: 'publishedBy', type: 'uuid', nullable: true })
  @AutoMap()
  publishedBy?: string | null;

  @Column({ name: 'importBatchId', type: 'uuid', nullable: true })
  @AutoMap()
  importBatchId?: string | null;

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

  /**
   * One-to-Many: Applications targeting this intake
   */
  @OneToMany(() => Applications, (app) => app.UniCourseIntake)
  Applications!: Applications[];

  /**
   * One-to-Many: Favourites (wishlist) pointing to this intake
   */
  @OneToMany(() => LeadFavouriteCourses, (fav) => fav.UniCourseIntake)
  LeadFavouriteCourse!: LeadFavouriteCourses[];
}
