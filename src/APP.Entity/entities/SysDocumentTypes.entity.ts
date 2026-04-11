import { Entity, Column, OneToMany, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { DocumentScope } from '@shared/enums/DocumentScope.enum';
import { BaseEntity } from './BaseEntity.template';
import { CourseRequiredDocuments } from './CourseRequiredDocuments.entity';
import { ApplicationRequiredDocuments } from './ApplicationRequiredDocuments.entity';
import { ApplicationDocuments } from './ApplicationDocuments.entity';
import { LeadDocuments } from './LeadDocuments.entity';

/**
 * Master list of document types (passport, transcript, etc.) with scope and validation rules.
 */
@Index('UQ_sys_DocumentTypes_documentTypeCode', ['documentTypeCode'], {
  unique: true,
})
@Entity('sys_DocumentTypes')
export class SysDocumentTypes extends BaseEntity {
  @Column({
    name: 'documentTypeCode',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  @AutoMap()
  documentTypeCode!: string;

  @Column({
    name: 'documentTypeName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  documentTypeName!: string;

  @Column({
    name: 'documentScope',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @AutoMap()
  documentScope!: DocumentScope;

  @Column({
    name: 'isMultipleAllowed',
    type: 'boolean',
    nullable: true,
  })
  @AutoMap()
  isMultipleAllowed?: boolean;

  @Column({
    name: 'description',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  description?: string;

  @Column({
    name: 'allowedMimeTypes',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  allowedMimeTypes?: string;

  @Column({
    name: 'maxFileSizeBytes',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  maxFileSizeBytes?: number;

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

  @OneToMany(() => CourseRequiredDocuments, (row) => row.SysDocumentType)
  CourseRequiredDocuments!: CourseRequiredDocuments[];

  @OneToMany(() => ApplicationRequiredDocuments, (row) => row.SysDocumentType)
  ApplicationRequiredDocuments!: ApplicationRequiredDocuments[];

  @OneToMany(() => ApplicationDocuments, (row) => row.SysDocumentType)
  ApplicationDocuments!: ApplicationDocuments[];

  @OneToMany(() => LeadDocuments, (row) => row.SysDocumentType)
  LeadDocuments!: LeadDocuments[];
}
