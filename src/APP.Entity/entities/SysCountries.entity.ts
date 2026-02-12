import { Entity, Column, OneToMany, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { LeadPreferredCountries } from './LeadPreferredCountries.entity';
import { SysStates } from './SysStates.entity';

/**
 * @class SysCountries
 * @extends {BaseEntity}
 *
 * **Search Indexes:**
 * - countryName: Search pipeline ILIKE searchText
 */
@Entity('sys_Countries')
@Index('IX_SysCountries_countryName', ['countryName'])
export class SysCountries extends BaseEntity {
  @Column({
    name: 'countryName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  countryName!: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * One-to-Many: Lead preferences
   * All leads who have selected this country as a preference
   */
  @OneToMany(() => LeadPreferredCountries, (pref) => pref.SysCountry)
  LeadPreferredCountry!: LeadPreferredCountries[];

  /**
   * One-to-Many: States
   * All states/provinces in this country
   */
  @OneToMany(() => SysStates, (state) => state.SysCountry)
  SysState!: SysStates[];
}
