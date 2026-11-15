import { Entity, Column, OneToMany, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { LeadPreferredCountries } from './LeadPreferredCountries.entity';
import { LeadCrmInfos } from './LeadCrmInfos.entity';
import { SysStates } from './SysStates.entity';
import { SysStageRequiredDocuments } from './SysStageRequiredDocuments.entity';

/**
 * @class SysCountries
 * @extends {BaseEntity}
 *
 * **Search Indexes:**
 * - countryName: Search pipeline ILIKE searchText
 */
// Natural-key unique index lives in migration bulk-import-indexes (expression index).
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

  @Column({
    name: 'countryCode',
    type: 'varchar',
    length: 10, // you can adjust (e.g., 2 or 3 if ISO codes)
    nullable: true,
  })
  @AutoMap()
  countryCode?: string;

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

  @OneToMany(() => SysStageRequiredDocuments, (row) => row.SysCountry)
  SysStageRequiredDocuments!: SysStageRequiredDocuments[];

  /**
   * One-to-Many: CRM leads targeting this country
   */
  @OneToMany(() => LeadCrmInfos, (crm) => crm.TargetSysCountry)
  TargetLeadCrmInfos!: LeadCrmInfos[];
}
