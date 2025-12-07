import { Entity, Column } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class UserRoles
 * @extends {BaseEntity}
 */
@Entity('UserRoles')
export class UserRoles extends BaseEntity {
  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  userId!: string;

  @Column({
    name: 'role_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  roleId!: string;
}

