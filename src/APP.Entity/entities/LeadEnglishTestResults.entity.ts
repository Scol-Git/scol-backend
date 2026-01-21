import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysLeadProfiles } from './SysLeadProfiles.entity';
import { SysEnglishTests } from './SysEnglishTests.entity';
import { LeadEnglishTestSectionResults } from './LeadEnglishTestSectionResults.entity';

/**
 * @class LeadEnglishTestResults
 * @extends {BaseEntity}
 */
@Entity('LeadEnglishTestResults')
export class LeadEnglishTestResults extends BaseEntity {
  @Column({
    name: 'leadId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  leadId!: string;

  @Column({
    name: 'sysEngTestId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysEngTestId!: string;

  @Column({
    name: 'testDate',
    type: 'date',
    nullable: true,
  })
  @AutoMap()
  testDate?: Date;

  @Column({
    name: 'overallScore',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  overallScore?: string;

  @Column({
    name: 'isVerified',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  @AutoMap()
  isVerified!: boolean;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: Lead profile
   * Each test result belongs to one lead profile
   */
  @ManyToOne(() => SysLeadProfiles, (lead) => lead.englishTestResults)
  @JoinColumn({ name: 'leadId' })
  lead!: SysLeadProfiles;

  /**
   * Many-to-One: English test type
   * Each result is associated with a specific test (IELTS, TOEFL, etc.)
   */
  @ManyToOne(() => SysEnglishTests, (test) => test.leadEnglishTestResults)
  @JoinColumn({ name: 'sysEngTestId' })
  test!: SysEnglishTests;

  /**
   * One-to-Many: Section results
   * Each test result can have multiple section scores
   */
  @OneToMany(
    () => LeadEnglishTestSectionResults,
    (sectionResult) => sectionResult.result,
    { cascade: true },
  )
  sectionResults!: LeadEnglishTestSectionResults[];
}
