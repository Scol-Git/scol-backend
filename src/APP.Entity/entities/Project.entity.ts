import { Column, Entity, Index, ManyToOne, OneToMany, Unique } from 'typeorm';

import { BaseEntity } from './BaseEntity.template';
import { Organization } from './Organization.entity';
import { Todo } from './Todo.entity';

@Entity('projects')
@Unique('UQ_project_org_key', ['orgId', 'key'])
@Index('IX_project_org', ['orgId'])
export class Project extends BaseEntity {
  @Column({ type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => Organization, (o) => o.projects, { onDelete: 'CASCADE' })
  org!: Organization;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  key!: string;

  @OneToMany(() => Todo, (t) => t.project)
  todos!: Todo[];
}
