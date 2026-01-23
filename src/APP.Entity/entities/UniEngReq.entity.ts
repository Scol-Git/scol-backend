import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysUniversities } from './SysUniversities.entity';
import { SysEnglishTests } from './SysEnglishTests.entity';

/**
 * @class UniEngReq
 * @extends {BaseEntity}
 */
@Entity('UniEngReq')
export class UniEngReq extends BaseEntity {
  @Column({
    name: 'uniId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  uniId!: string;

  @Column({
    name: 'sysEngTestId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysEngTestId!: string;

  @Column({
    name: 'minOverallReq',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  minOverallReq?: string;

  @Column({
    name: 'minSectionReq',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  minSectionReq?: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: University
   * Each English requirement belongs to one university
   */
  @ManyToOne(() => SysUniversities, (uni) => uni.UniEngReq)
  @JoinColumn({ name: 'uniId' })
  SysUniversity!: SysUniversities;

  /**
   * Many-to-One: English test
   * Each requirement is for a specific English test (IELTS, TOEFL, etc.)
   */
  @ManyToOne(() => SysEnglishTests)
  @JoinColumn({ name: 'sysEngTestId' })
  SysEnglishTest!: SysEnglishTests;
}
