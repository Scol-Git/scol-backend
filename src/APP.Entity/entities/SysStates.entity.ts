import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysCountries } from './SysCountries.entity';
import { SysCities } from './SysCities.entity';

/**
 * @class SysStates
 * @extends {BaseEntity}
 */
// Natural-key unique index lives in migration bulk-import-indexes (expression index).
// synchronize: false stops typeorm:gen from dropping it.
@Entity('sys_States')
@Index('UQ_SysStates_country_name', { synchronize: false })
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
  // Publish / import tracking (bulk import draft -> publish)
  // ========================================

  @Column({ name: 'isPublished', type: 'boolean', nullable: false, default: true })
  @AutoMap()
  isPublished!: boolean;

  @Column({ name: 'publishedAt', type: 'timestamptz', nullable: true })
  @AutoMap()
  publishedAt?: Date | null;

  @Column({ name: 'publishedBy', type: 'uuid', nullable: true })
  @AutoMap()
  publishedBy?: string | null;

  @Column({ name: 'importBatchId', type: 'uuid', nullable: true })
  @AutoMap()
  importBatchId?: string | null;

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
