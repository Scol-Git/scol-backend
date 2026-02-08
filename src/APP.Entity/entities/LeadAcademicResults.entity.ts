import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysLeadProfiles } from './SysLeadProfiles.entity';
import { SysAcademicDegrees } from './SysAcademicDegrees.entity';

/**
 * @class LeadAcademicResults
 * @extends {BaseEntity}
 */
@Entity('LeadAcademicResults')
@Index('IX_LeadAcademicResults_lead_id_degree_id', ['leadId', 'degreeId'])
export class LeadAcademicResults extends BaseEntity {
  @Column({
    name: 'lead_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  leadId!: string;

  @Column({
    name: 'degree_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  degreeId!: string;

  @Column({
    name: 'institute',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  institute!: string;

  @Column({
    name: 'gpa',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  gpa?: string;

  @Column({
    name: 'passing_date',
    type: 'date',
    nullable: true,
  })
  @AutoMap()
  passingDate?: Date;

  @Column({
    name: 'isVerified',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  @AutoMap()
  isVerified!: boolean;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: Lead profile
   * Each academic result belongs to one lead profile
   */
  @ManyToOne(() => SysLeadProfiles, (lead) => lead.LeadAcademicResult)
  @JoinColumn({ name: 'lead_id' })
  SysLeadProfile!: SysLeadProfiles;

  /**
   * Many-to-One: Academic degree
   * Each result is associated with a degree type
   */
  @ManyToOne(() => SysAcademicDegrees, (degree) => degree.LeadAcademicResult)
  @JoinColumn({ name: 'degree_id' })
  SysAcademicDegree!: SysAcademicDegrees;
}
