import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysLeadProfiles } from './SysLeadProfiles.entity';
import { SysCountries } from './SysCountries.entity';

/**
 * @class LeadPreferredCountries
 * @extends {BaseEntity}
 */
@Entity('LeadPreferredCountries')
@Index('IX_LeadPreferredCountries_lead_id_country_id', ['leadId', 'countryId'])
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
  @ManyToOne(() => SysLeadProfiles, (lead) => lead.LeadPreferredCountry)
  @JoinColumn({ name: 'lead_id' })
  SysLeadProfile!: SysLeadProfiles;

  /**
   * Many-to-One: Country
   * Each preference is associated with a specific country
   */
  @ManyToOne(() => SysCountries, (country) => country.LeadPreferredCountry)
  @JoinColumn({ name: 'country_id' })
  SysCountry!: SysCountries;
}
