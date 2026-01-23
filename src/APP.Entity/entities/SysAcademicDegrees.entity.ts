import { Entity, Column, OneToMany } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { LeadAcademicResults } from './LeadAcademicResults.entity';

/**
 * @class SysAcademicDegrees
 * @extends {BaseEntity}
 */
@Entity('sys_AcademicDegrees')
export class SysAcademicDegrees extends BaseEntity {
  @Column({
    name: 'degreeName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  degreeName!: string;

  @Column({
    name: 'gpaScale',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  gpaScale?: string;

  @Column({
    name: 'levelOrder',
    type: 'int',
    nullable: false,
  })
  @AutoMap()
  levelOrder!: number;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * One-to-Many: Lead academic results
   * All academic results associated with this degree type
   */
  @OneToMany(() => LeadAcademicResults, (result) => result.SysAcademicDegree)
  LeadAcademicResult!: LeadAcademicResults[];
}
