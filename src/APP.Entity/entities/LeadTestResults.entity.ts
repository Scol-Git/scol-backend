import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysLeadProfiles } from './SysLeadProfiles.entity';
import { SysEnglishTests } from './SysEnglishTests.entity';

/**
 * @class LeadTestResults
 * @extends {BaseEntity}
 */
@Entity('LeadTestResults')
export class LeadTestResults extends BaseEntity {
  @Column({
    name: 'lead_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  leadId!: string;

  @Column({
    name: 'test_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  testId!: string;

  @Column({
    name: 'score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  score?: string;

  @Column({
    name: 'test_date',
    type: 'date',
    nullable: true,
  })
  @AutoMap()
  testDate?: Date;

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
  @ManyToOne(() => SysLeadProfiles, (lead) => lead.LeadTestResult)
  @JoinColumn({ name: 'lead_id' })
  SysLeadProfile!: SysLeadProfiles;

  /**
   * Many-to-One: English test type
   * Each result is associated with a specific test (IELTS, TOEFL, etc.)
   */
  @ManyToOne(() => SysEnglishTests, (test) => test.LeadTestResult)
  @JoinColumn({ name: 'test_id' })
  SysEnglishTest!: SysEnglishTests;
}
