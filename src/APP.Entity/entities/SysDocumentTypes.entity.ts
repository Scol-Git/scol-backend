import { Entity, Column, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class SysDocumentTypes
 * @extends {BaseEntity}
 * Reference table for document types (e.g. Passport, Transcript, SOP).
 */
@Entity('sys_DocumentTypes')
@Index('IX_SysDocumentTypes_documentTypeCode', ['documentTypeCode'], {
  unique: true,
})
export class SysDocumentTypes extends BaseEntity {
  @Column({
    name: 'documentTypeCode',
    type: 'varchar',
    length: 50,
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
    name: 'isMultipleAllowed',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  @AutoMap()
  isMultipleAllowed!: boolean;

  @Column({
    name: 'description',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  description?: string;
}
