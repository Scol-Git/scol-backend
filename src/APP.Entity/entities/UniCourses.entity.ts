import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysUniversities } from './SysUniversities.entity';
import { SysProgrammes } from './SysProgrammes.entity';
import { SysAcademicDegrees } from './SysAcademicDegrees.entity';
import { UniCourseIntakes } from './UniCourseIntakes.entity';
import { CourseEngReq } from './CourseEngReq.entity';

/**
 * @class UniCourses
 * @extends {BaseEntity}
 */
@Entity('UniCourses')
export class UniCourses extends BaseEntity {
  @Column({
    name: 'uniId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  uniId!: string;

  @Column({
    name: 'sysProgrammeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysProgrammeId!: string;

  @Column({
    name: 'sysDegreeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysDegreeId!: string;

  @Column({
    name: 'courseName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  courseName!: string;

  @Column({
    name: 'minSysDegreeId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  minSysDegreeId?: string;

  @Column({
    name: 'minGpa',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  minGpa?: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: University
   * Each course belongs to one university
   */
  @ManyToOne(() => SysUniversities, (uni) => uni.courses)
  @JoinColumn({ name: 'uniId' })
  university!: SysUniversities;

  /**
   * Many-to-One: Programme
   * Each course is of a specific programme type
   */
  @ManyToOne(() => SysProgrammes)
  @JoinColumn({ name: 'sysProgrammeId' })
  programme!: SysProgrammes;

  /**
   * Many-to-One: Target degree level
   * The degree level this course awards (Bachelor, Master, etc.)
   */
  @ManyToOne(() => SysAcademicDegrees)
  @JoinColumn({ name: 'sysDegreeId' })
  degree!: SysAcademicDegrees;

  /**
   * Many-to-One: Minimum required degree
   * The minimum degree level required to apply for this course
   */
  @ManyToOne(() => SysAcademicDegrees)
  @JoinColumn({ name: 'minSysDegreeId' })
  minDegree?: SysAcademicDegrees;

  /**
   * One-to-Many: Course intakes
   * A course can have multiple intake offerings
   */
  @OneToMany(() => UniCourseIntakes, (courseIntake) => courseIntake.course)
  courseIntakes!: UniCourseIntakes[];

  /**
   * One-to-Many: English requirements
   * A course can have multiple English test requirements
   */
  @OneToMany(() => CourseEngReq, (req) => req.course)
  engReqs!: CourseEngReq[];
}
