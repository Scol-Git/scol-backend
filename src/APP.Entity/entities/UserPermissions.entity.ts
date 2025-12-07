import { Entity, Column } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class UserPermissions
 * @extends {BaseEntity}
 */
@Entity('UserPermissions')
export class UserPermissions extends BaseEntity {
  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  userId!: string;

  @Column({
    name: 'permission_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  permissionId!: string;
}

