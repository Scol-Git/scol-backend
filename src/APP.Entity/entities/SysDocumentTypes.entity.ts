import { Entity, Column, OneToMany } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { Document } from './Document.entity';

/**
 * Master list of document types (e.g. Passport, Transcript, CV).
 */
@Entity('sys_DocumentTypes')
export class SysDocumentTypes extends BaseEntity {
  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  name!: string;

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

  @OneToMany(() => Document, (doc) => doc.documentType)
  documents!: Document[];
}
