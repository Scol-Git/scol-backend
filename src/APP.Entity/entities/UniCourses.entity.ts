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
import { SysUniversities } from './SysUniversities.entity';
import { SysProgrammes } from './SysProgrammes.entity';
import { SysAcademicDegrees } from './SysAcademicDegrees.entity';
import { UniCourseIntakes } from './UniCourseIntakes.entity';
import { CourseEngReq } from './CourseEngReq.entity';
import { CourseRequiredDocuments } from './CourseRequiredDocuments.entity';

/**
 * @class UniCourses
 * @extends {BaseEntity}
 *
 * **Search Indexes:**
 * - uniId: FK join to SysUniversities
 * - sysProgrammeId: Programme filtering
 * - courseName: Text search
 */
@Entity('UniCourses')
@Index('IX_UniCourses_uniId', ['uniId'])
@Index('IX_UniCourses_sysProgrammeId', ['sysProgrammeId'])
@Index('IX_UniCourses_courseName', ['courseName'])
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

  @Column({
    name: 'higherSysDegreeId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  higherSysDegreeId?: string;

  @Column({
    name: 'higherGpa',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  higherGpa?: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: University
   * Each course belongs to one university
   */
  @ManyToOne(() => SysUniversities, (uni) => uni.UniCourse)
  @JoinColumn({ name: 'uniId' })
  SysUniversity!: SysUniversities;

  /**
   * Many-to-One: Programme
   * Each course is of a specific programme type
   */
  @ManyToOne(() => SysProgrammes)
  @JoinColumn({ name: 'sysProgrammeId' })
  SysProgramme!: SysProgrammes;

  /**
   * Many-to-One: Target degree level
   * The degree level this course awards (Bachelor, Master, etc.)
   */
  @ManyToOne(() => SysAcademicDegrees)
  @JoinColumn({ name: 'sysDegreeId' })
  SysAcademicDegree!: SysAcademicDegrees;
  

  /**
   * Many-to-One: Minimum required degree
   * The minimum degree level required to apply for this course
   */
  @ManyToOne(() => SysAcademicDegrees)
  @JoinColumn({ name: 'minSysDegreeId' })
  minSysAcademicDegree?: SysAcademicDegrees;

  /**
   * Many-to-One: Higher required degree
   * The higher degree level required to apply for this course
   */
  @ManyToOne(() => SysAcademicDegrees)
  @JoinColumn({ name: 'higherSysDegreeId' })
  higherSysAcademicDegree?: SysAcademicDegrees;

  /**
   * One-to-Many: Course intakes
   * A course can have multiple intake offerings
   */
  @OneToMany(() => UniCourseIntakes, (courseIntake) => courseIntake.UniCourse)
  UniCourseIntake!: UniCourseIntakes[];

  /**
   * One-to-Many: English requirements
   * A course can have multiple English test requirements
   */
  @OneToMany(() => CourseEngReq, (req) => req.UniCourse)
  CourseEngReq!: CourseEngReq[];

  /**
   * One-to-Many: Required document types for this course
   */
  @OneToMany(
    () => CourseRequiredDocuments,
    (req) => req.UniCourse,
    { cascade: true },
  )
  CourseRequiredDocument!: CourseRequiredDocuments[];
}
