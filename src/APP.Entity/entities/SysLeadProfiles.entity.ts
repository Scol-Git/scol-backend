import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysUsers } from './SysUsers.entity';
import { LeadAcademicResults } from './LeadAcademicResults.entity';
import { LeadTestResults } from './LeadTestResults.entity';
import { LeadPreferredCountries } from './LeadPreferredCountries.entity';
import { LeadPreferredPrograms } from './LeadPreferredPrograms.entity';

/**
 * @class SysLeadProfiles
 * @extends {BaseEntity}
 */
@Entity('sys_LeadProfiles')
export class SysLeadProfiles extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'lead_id' })
  @AutoMap()
  override id!: string;

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
   * Many-to-One: Associated user
   * Each lead profile belongs to one user
   */
  @ManyToOne(() => SysUsers, (user) => user.leadProfile)
  @JoinColumn({ name: 'user_id' })
  user!: SysUsers;

  /**
   * One-to-Many: Academic results
   * A lead can have multiple academic qualifications
   */
  @OneToMany(() => LeadAcademicResults, (result) => result.lead, {
    cascade: true,
  })
  academicResults!: LeadAcademicResults[];

  /**
   * One-to-Many: English test results
   * A lead can have multiple test results (IELTS, TOEFL, etc.)
   */
  @OneToMany(() => LeadTestResults, (result) => result.lead, { cascade: true })
  testResults!: LeadTestResults[];

  /**
   * One-to-Many: Preferred countries
   * A lead can specify multiple preferred study destinations
   */
  @OneToMany(() => LeadPreferredCountries, (pref) => pref.lead, {
    cascade: true,
  })
  preferredCountries!: LeadPreferredCountries[];

  /**
   * One-to-Many: Preferred programs
   * A lead can specify multiple preferred study programs
   */
  @OneToMany(() => LeadPreferredPrograms, (pref) => pref.lead, {
    cascade: true,
  })
  preferredPrograms!: LeadPreferredPrograms[];
}
