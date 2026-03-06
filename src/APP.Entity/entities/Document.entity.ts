import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysDocumentTypes } from './SysDocumentTypes.entity';
import { DocumentVersion } from './DocumentVersion.entity';

/**
 * Document aggregate root. Holds documentType and current version reference.
 */
@Entity('Documents')
export class Document extends BaseEntity {
  @Column({
    name: 'documentTypeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  documentTypeId!: string;

  @Column({
    name: 'currentVersionId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  currentVersionId?: string;

  @Column({
    name: 'overallStatus',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  overallStatus?: string;

  @Column({
    name: 'createdByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  createdByUserId?: string;

  @Column({
    name: 'updatedByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  updatedByUserId?: string;

  @ManyToOne(() => SysDocumentTypes, (dt) => dt.documents)
  @JoinColumn({ name: 'documentTypeId' })
  documentType!: SysDocumentTypes;

  @OneToMany(() => DocumentVersion, (v) => v.document)
  versions!: DocumentVersion[];
}
