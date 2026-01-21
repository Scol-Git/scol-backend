import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { LeadEnglishTestResults } from './LeadEnglishTestResults.entity';
import { SysEnglishTestSections } from './SysEnglishTestSections.entity';

/**
 * @class LeadEnglishTestSectionResults
 * @extends {BaseEntity}
 */
@Entity('LeadEnglishTestSectionResults')
export class LeadEnglishTestSectionResults extends BaseEntity {
  @Column({
    name: 'resultId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  resultId!: string;

  @Column({
    name: 'sysEngTestSectionId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysEngTestSectionId!: string;

  @Column({
    name: 'sectionScore',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  sectionScore?: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: English test result
   * Each section result belongs to one test result
   */
  @ManyToOne(
    () => LeadEnglishTestResults,
    (result) => result.sectionResults,
  )
  @JoinColumn({ name: 'resultId' })
  result!: LeadEnglishTestResults;

  /**
   * Many-to-One: Test section
   * Each section result is for a specific test section (Speaking, Writing, etc.)
   */
  @ManyToOne(
    () => SysEnglishTestSections,
    (section) => section.sectionResults,
  )
  @JoinColumn({ name: 'sysEngTestSectionId' })
  section!: SysEnglishTestSections;
}
