import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysConsultantProfiles } from './SysConsultantProfiles.entity';

/**
 * Certification card on a consultant's public profile.
 *
 * @class ConsultantCertifications
 * @extends {BaseEntity}
 */
@Index('IX_ConsultantCertifications_consultantProfileId', [
  'consultantProfileId',
])
@Entity('ConsultantCertifications')
export class ConsultantCertifications extends BaseEntity {
  @Column({
    name: 'consultantProfileId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  consultantProfileId!: string;

  @Column({
    name: 'issuingOrganization',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  issuingOrganization!: string;

  @Column({
    name: 'certificateName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  certificateName!: string;

  @Column({
    name: 'issuedDate',
    type: 'date',
    nullable: true,
  })
  @AutoMap()
  issuedDate?: Date;

  @Column({
    name: 'certRole',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  @AutoMap()
  certRole?: string;

  @Column({
    name: 'certificateId',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  @AutoMap()
  certificateId?: string;

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

  @ManyToOne(
    () => SysConsultantProfiles,
    (profile) => profile.ConsultantCertification,
  )
  @JoinColumn({ name: 'consultantProfileId' })
  SysConsultantProfile!: SysConsultantProfiles;
}
