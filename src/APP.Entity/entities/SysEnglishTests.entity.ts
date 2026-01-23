import { Entity, Column, OneToMany } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { LeadTestResults } from './LeadTestResults.entity';
import { SysEnglishTestSections } from './SysEnglishTestSections.entity';
import { LeadEnglishTestResults } from './LeadEnglishTestResults.entity';

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

  @Column({
    name: 'maxScore',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  maxScore?: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * One-to-Many: Test sections
   * All sections for this test (Speaking, Writing, Reading, Listening)
   */
  @OneToMany(() => SysEnglishTestSections, (section) => section.SysEnglishTest)
  SysEnglishTestSection!: SysEnglishTestSections[];

  /**
   * One-to-Many: Lead test results (legacy)
   * All test results associated with this test type
   */
  @OneToMany(() => LeadTestResults, (result) => result.SysEnglishTest)
  LeadTestResult!: LeadTestResults[];

  /**
   * One-to-Many: Lead English test results
   * All English test results associated with this test type
   */
  @OneToMany(() => LeadEnglishTestResults, (result) => result.SysEnglishTest)
  LeadEnglishTestResult!: LeadEnglishTestResults[];
}
