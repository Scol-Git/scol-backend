import { Entity, Column, OneToMany } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { LeadPreferredPrograms } from './LeadPreferredPrograms.entity';

/**
 * @class SysProgrammes
 * @extends {BaseEntity}
 */
@Entity('sys_Programmes')
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
  @OneToMany(() => LeadPreferredPrograms, (pref) => pref.programme)
  leadPreferences!: LeadPreferredPrograms[];
}
