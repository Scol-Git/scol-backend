import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysLeadProfiles } from './SysLeadProfiles.entity';
import { SysProgrammes } from './SysProgrammes.entity';

/**
 * @class LeadPreferredPrograms
 * @extends {BaseEntity}
 */
@Entity('LeadPreferredPrograms')
@Index('IX_LeadPreferredPrograms_lead_id_programme_id', [
  'leadId',
  'programmeId',
])
export class LeadPreferredPrograms extends BaseEntity {
  @Column({
    name: 'lead_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  leadId!: string;

  @Column({
    name: 'programme_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  programmeId!: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: Lead profile
   * Each preferred program belongs to one lead profile
   */
  @ManyToOne(() => SysLeadProfiles, (lead) => lead.LeadPreferredProgram)
  @JoinColumn({ name: 'lead_id' })
  SysLeadProfile!: SysLeadProfiles;

  /**
   * Many-to-One: Programme
   * Each preference is associated with a specific study programme
   */
  @ManyToOne(() => SysProgrammes, (programme) => programme.LeadPreferredProgram)
  @JoinColumn({ name: 'programme_id' })
  SysProgramme!: SysProgrammes;
}
