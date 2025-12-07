import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class SysPermissions
 * @extends {BaseEntity}
 */
@Entity('sys_Permissions')
export class SysPermissions extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'permission_id' })
  @AutoMap()
  override id!: string;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  name!: string;
}

