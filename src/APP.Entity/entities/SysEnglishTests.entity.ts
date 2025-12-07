import { Entity, Column } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class SysEnglishTests
 * @extends {BaseEntity}
 */
@Entity('sys_EnglishTests')
export class SysEnglishTests extends BaseEntity {
  @Column({
    name: 'testName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  testName!: string;
}

