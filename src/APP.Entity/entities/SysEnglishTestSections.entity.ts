import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysEnglishTests } from './SysEnglishTests.entity';
import { LeadEnglishTestSectionResults } from './LeadEnglishTestSectionResults.entity';

/**
 * @class SysEnglishTestSections
 * @extends {BaseEntity}
 */
@Entity('sys_EnglishTestSections')
export class SysEnglishTestSections extends BaseEntity {
  @Column({
    name: 'testId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  testId!: string;

  @Column({
    name: 'sectionName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  sectionName!: string;

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
   * Many-to-One: English test
   * Each section belongs to one test (IELTS, TOEFL, etc.)
   */
  @ManyToOne(() => SysEnglishTests, (test) => test.sections)
  @JoinColumn({ name: 'testId' })
  test!: SysEnglishTests;

  /**
   * One-to-Many: Section results
   * All section results for this test section
   */
  @OneToMany(
    () => LeadEnglishTestSectionResults,
    (sectionResult) => sectionResult.section,
  )
  sectionResults!: LeadEnglishTestSectionResults[];
}
