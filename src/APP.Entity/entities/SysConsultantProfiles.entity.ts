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
import { ConsultantCertifications } from './ConsultantCertifications.entity';
import { LeadCrmInfos } from './LeadCrmInfos.entity';
import { Applications } from './Applications.entity';
import { SysLeadProfiles } from './SysLeadProfiles.entity';

/**
 * Public-facing profile for CRM staff (counselor / admin / agent).
 *
 * @class SysConsultantProfiles
 * @extends {BaseEntity}
 */
@Index('IX_SysConsultantProfiles_user', ['userId'], { unique: true })
@Index('IX_SysConsultantProfiles_isPublished_sortOrder', [
  'isPublished',
  'sortOrder',
])
@Entity('sys_ConsultantProfiles')
export class SysConsultantProfiles extends BaseEntity {
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
    name: 'designation',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  designation?: string;

  @Column({
    name: 'organization',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  organization?: string;

  @Column({
    name: 'bio',
    type: 'text',
    nullable: true,
  })
  @AutoMap()
  bio?: string;

  @Column({
    name: 'imgUrl',
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  @AutoMap()
  imgUrl?: string;

  @Column({
    name: 'contactPhone',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  contactPhone?: string;

  @Column({
    name: 'contactEmail',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  contactEmail?: string;

  @Column({
    name: 'officeHours',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  officeHours?: string;

  @Column({
    name: 'bookSessionUrl',
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  @AutoMap()
  bookSessionUrl?: string;

  @Column({
    name: 'isPublished',
    type: 'boolean',
    nullable: false,
  })
  @AutoMap()
  isPublished!: boolean;

  @Column({
    name: 'sortOrder',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  sortOrder?: number;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * One-to-One: Associated CRM user
   */
  @OneToOne(() => SysUsers, (user) => user.SysConsultantProfile)
  @JoinColumn({ name: 'user_id' })
  SysUser!: SysUsers;

  /**
   * One-to-Many: Professional certifications shown on the profile
   */
  @OneToMany(
    () => ConsultantCertifications,
    (cert) => cert.SysConsultantProfile,
    { cascade: true },
  )
  ConsultantCertification!: ConsultantCertifications[];

  /**
   * One-to-Many: Lead CRM info rows assigned to this consultant profile
   */
  @OneToMany(() => LeadCrmInfos, 'ConsultantProfile')
  ConsultantLeadCrmInfos!: LeadCrmInfos[];

  /**
   * One-to-Many: Applications assigned to this consultant profile
   */
  @OneToMany(() => Applications, 'AssignedToConsultant')
  AssignedApplications!: Applications[];

  /**
   * One-to-Many: Lead profiles assigned to this consultant profile
   */
  @OneToMany(() => SysLeadProfiles, 'AssignedToUser')
  AssignedLeadProfiles!: SysLeadProfiles[];
}
