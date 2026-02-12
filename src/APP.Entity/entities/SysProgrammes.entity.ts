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
@Entity('sys_Programmes')
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
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * One-to-Many: Lead preferences
   * All leads who have selected this programme as a preference
   */
  @OneToMany(() => LeadPreferredPrograms, (pref) => pref.SysProgramme)
  LeadPreferredProgram!: LeadPreferredPrograms[];
}
