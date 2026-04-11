import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysUsers } from './SysUsers.entity';
import { LeadAcademicResults } from './LeadAcademicResults.entity';
import { LeadTestResults } from './LeadTestResults.entity';
import { LeadEnglishTestResults } from './LeadEnglishTestResults.entity';
import { LeadPreferredCountries } from './LeadPreferredCountries.entity';
import { LeadPreferredPrograms } from './LeadPreferredPrograms.entity';
import { Applications } from './Applications.entity';
import { LeadDocuments } from './LeadDocuments.entity';

/**
 * @class SysLeadProfiles
 * @extends {BaseEntity}
 */
@Index('IX_SysLeadProfiles_user', ['userId'], { unique: true })
@Entity('sys_LeadProfiles')
export class SysLeadProfiles extends BaseEntity {
  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  userId!: string;

  @Column({
    name: 'fullName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  fullName!: string;

  @Column({
    name: 'dob',
    type: 'date',
    nullable: true,
  })
  @AutoMap()
  dob?: Date;

  @Column({
    name: 'gender',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  gender?: string;

  @Column({
    name: 'address',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  address?: string;

  @Column({
    name: 'city',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  city?: string;

  @Column({
    name: 'imgUrl',
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  @AutoMap()
  imgUrl?: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * One-to-One: Associated user
   * Each lead profile belongs to one user
   */
  @OneToOne(() => SysUsers, (user) => user.SysLeadProfile)
  @JoinColumn({ name: 'user_id' })
  SysUser!: SysUsers;

  /**
   * One-to-Many: Academic results
   * A lead can have multiple academic qualifications
   */
  @OneToMany(() => LeadAcademicResults, (result) => result.SysLeadProfile, {
    cascade: true,
  })
  LeadAcademicResult!: LeadAcademicResults[];

  /**
   * One-to-Many: English test results (legacy)
   * A lead can have multiple test results (IELTS, TOEFL, etc.)
   */
  @OneToMany(() => LeadTestResults, (result) => result.SysLeadProfile, {
    cascade: true,
  })
  LeadTestResult!: LeadTestResults[];

  /**
   * One-to-Many: English test results
   * A lead can have multiple English test results with section scores
   */
  @OneToMany(() => LeadEnglishTestResults, (result) => result.SysLeadProfile, {
    cascade: true,
  })
  LeadEnglishTestResult!: LeadEnglishTestResults[];

  /**
   * One-to-Many: Preferred countries
   * A lead can specify multiple preferred study destinations
   */
  @OneToMany(() => LeadPreferredCountries, (pref) => pref.SysLeadProfile, {
    cascade: true,
  })
  LeadPreferredCountry!: LeadPreferredCountries[];

  /**
   * One-to-Many: Preferred programs
   * A lead can specify multiple preferred study programs
   */
  @OneToMany(() => LeadPreferredPrograms, (pref) => pref.SysLeadProfile, {
    cascade: true,
  })
  LeadPreferredProgram!: LeadPreferredPrograms[];

  /**
   * One-to-Many: Applications submitted by this lead
   */
  @OneToMany(() => Applications, (app) => app.SysLeadProfile)
  Applications!: Applications[];

  /**
   * One-to-Many: Lead-scoped documents
   */
  @OneToMany(() => LeadDocuments, (doc) => doc.SysLeadProfile)
  LeadDocuments!: LeadDocuments[];
}
