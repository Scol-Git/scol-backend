import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysCountries } from './SysCountries.entity';
import { SysApplicationStage } from './SysApplicationStage.entity';
import { SysDocumentTypes } from './SysDocumentTypes.entity';
import { ApplicationRequiredDocuments } from './ApplicationRequiredDocuments.entity';

/**
 * Catalog: which document types are required per country and application stage.
 */
@Index('IX_sys_StageRequiredDocuments_sysCountryId', ['sysCountryId'])
@Index('IX_sys_StageRequiredDocuments_sysApplicationStageId', [
  'sysApplicationStageId',
])
@Index('IX_sys_StageRequiredDocuments_sysDocumentTypeId', [
  'sysDocumentTypeId',
])
@Entity('sys_StageRequiredDocuments')
export class SysStageRequiredDocuments extends BaseEntity {
  @Column({
    name: 'sysCountryId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysCountryId!: string;

  @Column({
    name: 'sysApplicationStageId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysApplicationStageId!: string;

  @Column({
    name: 'sysDocumentTypeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysDocumentTypeId!: string;

  @Column({
    name: 'isRequired',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  @AutoMap()
  isRequired!: boolean;

  @Column({
    name: 'minCount',
    type: 'int',
    nullable: false,
    default: 1,
  })
  @AutoMap()
  minCount!: number;

  @Column({
    name: 'maxCount',
    type: 'int',
    nullable: false,
    default: 1,
  })
  @AutoMap()
  maxCount!: number;

  @Column({
    name: 'displayOrder',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  displayOrder?: number;

  @Column({
    name: 'isActive',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  @AutoMap()
  isActive!: boolean;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  @ManyToOne(() => SysCountries, (c) => c.SysStageRequiredDocuments, {
    nullable: false,
  })
  @JoinColumn({ name: 'sysCountryId' })
  SysCountry!: SysCountries;

  @ManyToOne(
    () => SysApplicationStage,
    (s) => s.SysStageRequiredDocuments,
    { nullable: false },
  )
  @JoinColumn({ name: 'sysApplicationStageId' })
  SysApplicationStage!: SysApplicationStage;

  @ManyToOne(() => SysDocumentTypes, (dt) => dt.SysStageRequiredDocuments, {
    nullable: false,
  })
  @JoinColumn({ name: 'sysDocumentTypeId' })
  SysDocumentType!: SysDocumentTypes;

  @OneToMany(
    () => ApplicationRequiredDocuments,
    (req) => req.SysStageRequiredDocument,
  )
  ApplicationRequiredDocuments!: ApplicationRequiredDocuments[];
}
