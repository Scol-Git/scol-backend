import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysCountries } from './SysCountries.entity';
import { SysCities } from './SysCities.entity';

/**
 * @class SysStates
 * @extends {BaseEntity}
 */
@Entity('sys_States')
export class SysStates extends BaseEntity {
  @Column({
    name: 'sysCountryId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysCountryId!: string;

  @Column({
    name: 'stateName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  stateName!: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: Country
   * Each state belongs to one country
   */
  @ManyToOne(() => SysCountries, (country) => country.SysState)
  @JoinColumn({ name: 'sysCountryId' })
  SysCountry!: SysCountries;

  /**
   * One-to-Many: Cities
   * A state can have multiple cities
   */
  @OneToMany(() => SysCities, (city) => city.SysState)
  SysCity!: SysCities[];
}
