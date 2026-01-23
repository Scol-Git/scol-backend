import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { UniCourseIntakes } from './UniCourseIntakes.entity';

/**
 * @class CourseIntakeScholarships
 * @extends {BaseEntity}
 */
@Entity('CourseIntakeScholarships')
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
    name: 'maxAmount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  maxAmount?: string;

  @Column({
    name: 'criteriaJson',
    type: 'text',
    nullable: true,
  })
  @AutoMap()
  criteriaJson?: string;

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
