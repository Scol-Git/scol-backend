import {
  Entity,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysLeadProfiles } from './SysLeadProfiles.entity';
import { SysConsultantProfiles } from './SysConsultantProfiles.entity';
import { SysCountries } from './SysCountries.entity';
import { RegisterSource } from '@shared/enums/crm/RegisterSource.enum';
import { LeadStatus } from '@shared/enums/crm/LeadStatus.enum';
import { EnrollmentStatus } from '@shared/enums/crm/EnrollmentStatus.enum';

/**
 * CRM metadata for a lead profile (registration source, status, enrollment, etc.).
 */
@Index('UQ_LeadCrmInfos_leadId', ['leadId'], { unique: true })
@Entity('LeadCrmInfos')
export class LeadCrmInfos extends BaseEntity {
  @Column({
    name: 'leadId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  leadId!: string;

  @Column({
    name: 'consultantId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  consultantId?: string | null;

  @Column({
    name: 'registerSource',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  registerSource?: RegisterSource;

  @Column({
    name: 'registerDate',
    type: 'date',
    nullable: false,
  })
  @AutoMap()
  registerDate!: Date;

  @Column({
    name: 'leadStatus',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  leadStatus?: LeadStatus;

  @Column({
    name: 'targetSysCountryId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  targetSysCountryId?: string | null;

  @Column({
    name: 'hasPassedEnglishTest',
    type: 'boolean',
    nullable: true,
  })
  @AutoMap()
  hasPassedEnglishTest?: boolean;

  @Column({
    name: 'hasAnyApplication',
    type: 'boolean',
    nullable: true,
  })
  @AutoMap()
  hasAnyApplication?: boolean;

  @Column({
    name: 'hasSuccessfulVisa',
    type: 'boolean',
    nullable: true,
  })
  @AutoMap()
  hasSuccessfulVisa?: boolean;

  @Column({
    name: 'enrollmentStatus',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  enrollmentStatus?: EnrollmentStatus;

  @Column({
    name: 'enrollmentDate',
    type: 'date',
    nullable: true,
  })
  @AutoMap()
  enrollmentDate?: Date;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  @OneToOne(() => SysLeadProfiles, (lead) => lead.LeadCrmInfo)
  @JoinColumn({ name: 'leadId' })
  SysLeadProfile!: SysLeadProfiles;

  @ManyToOne(
    () => SysConsultantProfiles,
    (profile) => profile.ConsultantLeadCrmInfos,
    {
      nullable: true,
    },
  )
  @JoinColumn({ name: 'consultantId', referencedColumnName: 'id' })
  ConsultantProfile?: SysConsultantProfiles | null;

  @ManyToOne(() => SysCountries, (country) => country.TargetLeadCrmInfos, {
    nullable: true,
  })
  @JoinColumn({ name: 'targetSysCountryId' })
  TargetSysCountry?: SysCountries | null;
}
