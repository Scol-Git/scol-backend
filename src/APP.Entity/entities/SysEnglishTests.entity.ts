import { Entity, Column, OneToMany } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { LeadTestResults } from './LeadTestResults.entity';

/**
 * @class SysEnglishTests
 * @extends {BaseEntity}
 */
@Entity('sys_EnglishTests')
export class SysEnglishTests extends BaseEntity {
  @Column({
    name: 'testName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  testName!: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * One-to-Many: Lead test results
   * All test results associated with this test type
   */
  @OneToMany(() => LeadTestResults, (result) => result.test)
  leadResults!: LeadTestResults[];
}
