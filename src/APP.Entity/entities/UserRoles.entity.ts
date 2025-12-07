import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysUsers } from './SysUsers.entity';
import { SysRoles } from './SysRoles.entity';

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

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================
  /**
   * Many-to-One: User
   * Direct access to the user in this junction
   */
  @ManyToOne(() => SysUsers, (user) => user.roles)
  @JoinColumn({ name: 'user_id' })
  user!: SysUsers;

  /**
   * Many-to-One: Role
   * Direct access to the role in this junction
   */
  @ManyToOne(() => SysRoles, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role!: SysRoles;
}
