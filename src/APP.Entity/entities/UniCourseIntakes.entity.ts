import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { UniCourses } from './UniCourses.entity';
import { UniIntakes } from './UniIntakes.entity';
import { CourseIntakeScholarships } from './CourseIntakeScholarships.entity';

/**
 * @class UniCourseIntakes
 * @extends {BaseEntity}
 */
@Entity('UniCourseIntakes')
export class UniCourseIntakes extends BaseEntity {
  @Column({
    name: 'uniCourseId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  uniCourseId!: string;

  @Column({
    name: 'uniIntakeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  uniIntakeId!: string;

  @Column({
    name: 'intakeYear',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  intakeYear?: number;

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
   * Many-to-One: University intake
   * Each course intake is for a specific university intake period
   */
  @ManyToOne(() => UniIntakes, (uniIntake) => uniIntake.UniCourseIntake)
  @JoinColumn({ name: 'uniIntakeId' })
  UniIntake!: UniIntakes;

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
