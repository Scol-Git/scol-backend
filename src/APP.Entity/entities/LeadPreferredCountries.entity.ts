import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysLeadProfiles } from './SysLeadProfiles.entity';
import { SysCountries } from './SysCountries.entity';

/**
 * @class LeadPreferredCountries
 * @extends {BaseEntity}
 */
@Entity('LeadPreferredCountries')
export class LeadPreferredCountries extends BaseEntity {
  @Column({
    name: 'lead_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  leadId!: string;

  @Column({
    name: 'country_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  countryId!: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: Lead profile
   * Each preferred country belongs to one lead profile
   */
  @ManyToOne(() => SysLeadProfiles, (lead) => lead.preferredCountries)
  @JoinColumn({ name: 'lead_id' })
  lead!: SysLeadProfiles;

  /**
   * Many-to-One: Country
   * Each preference is associated with a specific country
   */
  @ManyToOne(() => SysCountries, (country) => country.leadPreferences)
  @JoinColumn({ name: 'country_id' })
  country!: SysCountries;
}
