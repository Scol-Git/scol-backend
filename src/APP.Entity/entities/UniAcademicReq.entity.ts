import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysUniversities } from './SysUniversities.entity';
import { SysAcademicDegrees } from './SysAcademicDegrees.entity';

/**
 * @class UniAcademicReq
 * @extends {BaseEntity}
 */
@Entity('UniAcademicReq')
export class UniAcademicReq extends BaseEntity {
  @Column({
    name: 'uniId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  uniId!: string;

  @Column({
    name: 'sysDegreeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysDegreeId!: string;

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
   * Each academic requirement belongs to one university
   */
  @ManyToOne(() => SysUniversities, (uni) => uni.academicReqs)
  @JoinColumn({ name: 'uniId' })
  university!: SysUniversities;

  /**
   * Many-to-One: Minimum degree level
   * The minimum prior degree level required at university-level
   */
  @ManyToOne(() => SysAcademicDegrees)
  @JoinColumn({ name: 'sysDegreeId' })
  degree!: SysAcademicDegrees;
}
