import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { UniCourses } from './UniCourses.entity';
import { SysEnglishTests } from './SysEnglishTests.entity';

/**
 * @class CourseEngReq
 * @extends {BaseEntity}
 *
 * **Search Indexes:**
 * - uniCourseId: FK join to UniCourses (eligibility checking)
 */
@Entity('CourseEngReq')
@Index('IX_CourseEngReq_uniCourseId', ['uniCourseId'])
export class CourseEngReq extends BaseEntity {
  @Column({
    name: 'uniCourseId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  uniCourseId!: string;

  @Column({
    name: 'sysEngTestId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysEngTestId!: string;

  @Column({
    name: 'minOverallReq',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  minOverallReq?: string;

  @Column({
    name: 'minSectionReq',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  minSectionReq?: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: University course
   * Each English requirement belongs to one course
   */
  @ManyToOne(() => UniCourses, (course) => course.CourseEngReq)
  @JoinColumn({ name: 'uniCourseId' })
  UniCourse!: UniCourses;

  /**
   * Many-to-One: English test
   * Each requirement is for a specific English test (IELTS, TOEFL, etc.)
   */
  @ManyToOne(() => SysEnglishTests)
  @JoinColumn({ name: 'sysEngTestId' })
  SysEnglishTest!: SysEnglishTests;
}
