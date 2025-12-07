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

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * One-to-Many: Lead academic results
   * All academic results associated with this degree type
   */
  @OneToMany(() => LeadAcademicResults, (result) => result.degree)
  leadResults!: LeadAcademicResults[];
}
