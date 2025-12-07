import { Entity, Column, OneToMany } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { LeadPreferredCountries } from './LeadPreferredCountries.entity';

/**
 * @class SysCountries
 * @extends {BaseEntity}
 */
@Entity('sys_Countries')
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
  @OneToMany(() => LeadPreferredCountries, (pref) => pref.country)
  leadPreferences!: LeadPreferredCountries[];
}
