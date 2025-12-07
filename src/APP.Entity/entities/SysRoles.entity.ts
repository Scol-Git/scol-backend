import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class SysRoles
 * @extends {BaseEntity}
 */
@Entity('sys_Roles')
export class SysRoles extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'role_id' })
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

