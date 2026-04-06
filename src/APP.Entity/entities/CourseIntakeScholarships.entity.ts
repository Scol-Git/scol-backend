import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { UniCourseIntakes } from './UniCourseIntakes.entity';

import { MetaDataItem } from '@shared/dtos/course-details/MetaDataItem.type';

/**
 * @class CourseIntakeScholarships
 * @extends {BaseEntity}
 *
 * **Search Indexes:**
 * - courseIntakeId: FK join to UniCourseIntakes
 * - Composite (courseIntakeId, isActive): EXISTS subquery optimization
 */
@Entity('CourseIntakeScholarships')
@Index('IX_CourseIntakeScholarships_courseIntakeId', ['courseIntakeId'])
@Index('IX_CourseIntakeScholarships_courseIntakeId_isActive', [
  'courseIntakeId',
  'isActive',
])
export class CourseIntakeScholarships extends BaseEntity {
  @Column({
    name: 'courseIntakeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  courseIntakeId!: string;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  name!: string;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  amount?: string;

  @Column({
    name: 'amountType',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  amountType?: string;

  @Column({
    name: 'frequency',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  frequency?: string;

  @Column({ name: 'scholarshipMetaData', type: 'jsonb', nullable: true })
  @AutoMap()
  scholarshipMetaData?: MetaDataItem[];

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
   * Many-to-One: Course intake
   * Each scholarship is tied to a specific course intake offering
   */
  @ManyToOne(
    () => UniCourseIntakes,
    (courseIntake) => courseIntake.CourseIntakeScholarship,
  )
  @JoinColumn({ name: 'courseIntakeId' })
  UniCourseIntake!: UniCourseIntakes;
}
