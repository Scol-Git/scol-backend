import { Entity, Column, OneToMany, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { LeadPreferredPrograms } from './LeadPreferredPrograms.entity';

/**
 * @class SysProgrammes
 * @extends {BaseEntity}
 *
 * **Search Indexes:**
 * - name: Search pipeline ILIKE searchText (programme name)
 */
// Natural-key unique index lives in migration bulk-import-indexes (expression index).
// synchronize: false stops typeorm:gen from dropping it.
@Entity('sys_Programmes')
@Index('UQ_SysProgrammes_name', { synchronize: false })
@Index('IX_SysProgrammes_name', ['name'])
export class SysProgrammes extends BaseEntity {
  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  name!: string;

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
   * All leads who have selected this programme as a preference
   */
  @OneToMany(() => LeadPreferredPrograms, (pref) => pref.SysProgramme)
  LeadPreferredProgram!: LeadPreferredPrograms[];
}
