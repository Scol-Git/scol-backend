import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

import { MetaDataItem } from '@shared/types/MetaDataItem.type';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysCountries } from './SysCountries.entity';
import { SysStates } from './SysStates.entity';
import { SysCities } from './SysCities.entity';
import { UniCourses } from './UniCourses.entity';
import { UniAcademicReq } from './UniAcademicReq.entity';
import { UniEngReq } from './UniEngReq.entity';
import { CommissionType } from '@shared/enums/CommissionType.enum';

/**
 * @class SysUniversities
 * @extends {BaseEntity}
 *
 * **Search Indexes:**
 * - sysCountryId: Country filtering (most common)
 * - sysCityId: City filtering
 * - sysStateId: State filtering
 * - uniName: Text search
 * - commission: Business ranking (DB-level commission sorting)
 */
@Entity('sys_Universities')
@Index('IX_SysUniversities_sysCountryId', ['sysCountryId'])
@Index('IX_SysUniversities_sysCityId', ['sysCityId'])
@Index('IX_SysUniversities_sysStateId', ['sysStateId'])
@Index('IX_SysUniversities_uniName', ['uniName'])
@Index('IX_SysUniversities_commission', ['commission'])
export class SysUniversities extends BaseEntity {
  @Column({
    name: 'uniName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  uniName!: string;

  @Column({
    name: 'sysCountryId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysCountryId!: string;

  @Column({
    name: 'sysStateId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  sysStateId?: string;

  @Column({
    name: 'sysCityId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  sysCityId?: string;

  @Column({
    name: 'logoUrl',
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  @AutoMap()
  logoUrl?: string;

  @Column({
    name: 'website',
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  @AutoMap()
  website?: string;

  @Column({
    name: 'aboutUs',
    type: 'text',
    nullable: true,
  })
  @AutoMap()
  aboutUs?: string;

  @Column({
    name: 'address',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  address?: string;

  @Column({
    name: 'coverImageUrl',
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  @AutoMap()
  coverImageUrl?: string;

  @Column({
    name: 'campusLifeLinks',
    type: 'simple-array',
    nullable: true,
  })
  @AutoMap()
  campusLifeLinks?: string[];

  @Column({
    name: 'commission',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  commission?: string;

  @Column({
    name: 'commissionType',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  @AutoMap()
  commissionType?: CommissionType;

  @Column({
    name: 'establishedYear',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  establishedYear?: number;

  @Column({
    name: 'universityType',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  @AutoMap()
  universityType?: string;

  @Column({
    name: 'locationMapMetaData',
    type: 'varchar',
    nullable: true,
  })
  @AutoMap()
  locationMapMetaData?: string;

  @Column({
    name: 'currRanking',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  currRanking?: number;

  @Column({ name: 'rankingMetaData', type: 'jsonb', nullable: true })
  @AutoMap()
  rankingMetaData?: MetaDataItem[];

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: Country
   * Each university is located in one country
   */
  @ManyToOne(() => SysCountries)
  @JoinColumn({ name: 'sysCountryId' })
  SysCountry!: SysCountries;

  /**
   * Many-to-One: State
   * Each university may be located in one state
   */
  @ManyToOne(() => SysStates)
  @JoinColumn({ name: 'sysStateId' })
  SysState?: SysStates;

  /**
   * Many-to-One: City
   * Each university may be located in one city
   */
  @ManyToOne(() => SysCities)
  @JoinColumn({ name: 'sysCityId' })
  SysCity?: SysCities;

  /**
   * One-to-Many: University courses
   * A university can offer multiple courses
   */
  @OneToMany(() => UniCourses, (course) => course.SysUniversity)
  UniCourse!: UniCourses[];

  /**
   * One-to-Many: Academic requirements
   * A university can have multiple academic requirements
   */
  @OneToMany(() => UniAcademicReq, (req) => req.SysUniversity)
  UniAcademicReq!: UniAcademicReq[];

  /**
   * One-to-Many: English requirements
   * A university can have multiple English test requirements
   */
  @OneToMany(() => UniEngReq, (req) => req.SysUniversity)
  UniEngReq!: UniEngReq[];
}
