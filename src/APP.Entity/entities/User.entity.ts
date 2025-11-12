import { Column, Entity, Index, ManyToOne, OneToMany, Unique } from 'typeorm';

import { BaseEntity } from './BaseEntity.template';
import { Organization } from './Organization.entity';
import { Todo } from './Todo.entity';

@Entity('users')
@Unique('UQ_user_org_email', ['orgId', 'email'])
@Index('IX_user_org', ['orgId'])
export class User extends BaseEntity {
  @Column({ type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => Organization, (o) => o.users, { onDelete: 'CASCADE' })
  org!: Organization;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 200 })
  passwordHash!: string;

  @Column('text', { array: true, default: '{}' })
  roles!: string[]; // e.g., ['todo:create','todo:read']

  @OneToMany(() => Todo, (t) => t.assignee)
  todos!: Todo[];
}
