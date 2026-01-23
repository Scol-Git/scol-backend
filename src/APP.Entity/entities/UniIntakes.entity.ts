import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysUniversities } from './SysUniversities.entity';
import { SysIntakes } from './SysIntakes.entity';
import { UniCourseIntakes } from './UniCourseIntakes.entity';

/**
 * @class UniIntakes
 * @extends {BaseEntity}
 */
@Entity('UniIntakes')
export class UniIntakes extends BaseEntity {
  @Column({
    name: 'uniId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  uniId!: string;

  @Column({
    name: 'sysIntakeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysIntakeId!: string;

  @Column({
    name: 'intakeName',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  intakeName?: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: University
   * Each university intake belongs to one university
   */
  @ManyToOne(() => SysUniversities, (uni) => uni.UniIntake)
  @JoinColumn({ name: 'uniId' })
  SysUniversity!: SysUniversities;

  /**
   * Many-to-One: Intake type
   * Each university intake is of a specific intake type (Fall, Spring, etc.)
   */
  @ManyToOne(() => SysIntakes, (intake) => intake.UniIntake)
  @JoinColumn({ name: 'sysIntakeId' })
  SysIntake!: SysIntakes;

  /**
   * One-to-Many: Course intakes
   * A university intake can be associated with multiple course intakes
   */
  @OneToMany(() => UniCourseIntakes, (courseIntake) => courseIntake.UniIntake)
  UniCourseIntake!: UniCourseIntakes[];
}
