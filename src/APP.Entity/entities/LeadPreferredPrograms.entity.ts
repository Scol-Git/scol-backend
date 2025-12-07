import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysLeadProfiles } from './SysLeadProfiles.entity';
import { SysProgrammes } from './SysProgrammes.entity';

/**
 * @class LeadPreferredPrograms
 * @extends {BaseEntity}
 */
@Entity('LeadPreferredPrograms')
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
  @ManyToOne(() => SysLeadProfiles, (lead) => lead.preferredPrograms)
  @JoinColumn({ name: 'lead_id' })
  lead!: SysLeadProfiles;

  /**
   * Many-to-One: Programme
   * Each preference is associated with a specific study programme
   */
  @ManyToOne(() => SysProgrammes, (programme) => programme.leadPreferences)
  @JoinColumn({ name: 'programme_id' })
  programme!: SysProgrammes;
}
