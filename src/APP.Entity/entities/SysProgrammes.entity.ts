import { Entity, Column } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class SysProgrammes
 * @extends {BaseEntity}
 */
@Entity('sys_Programmes')
export class SysProgrammes extends BaseEntity {
  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  name!: string;
}

