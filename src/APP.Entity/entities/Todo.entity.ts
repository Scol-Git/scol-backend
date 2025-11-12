import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  VersionColumn,
} from 'typeorm';

import { TodoStatus } from '@shared/constants/TodoStatus.constants';
import { TodoPriority } from '@shared/constants/TodoPriority.constants';

import { BaseEntity } from './BaseEntity.template';
import { Project } from './Project.entity';
import { User } from './User.entity';
import { TodoDependency } from './TodoDependency.entity';

@Entity('todo_items')
@Index('IX_todo_org', ['orgId'])
@Index('IX_todo_project', ['projectId'])
@Index('IX_todo_assignee', ['assigneeId'])
export class Todo extends BaseEntity {
  @Column({ type: 'uuid' })
  orgId!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project, (p) => p.todos, { onDelete: 'CASCADE' })
  project!: Project;

  @Column({ type: 'varchar', length: 300 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Using shared static-class values as enum options
  @Column({
    type: 'enum',
    enum: [
      TodoStatus.NEW,
      TodoStatus.IN_PROGRESS,
      TodoStatus.DONE,
      TodoStatus.BLOCKED,
    ],
    default: TodoStatus.NEW,
  })
  status!: string;

  @Column({ type: 'timestamptz', nullable: true })
  dueAt?: Date;

  @Column({
    type: 'enum',
    enum: [TodoPriority.LOW, TodoPriority.MEDIUM, TodoPriority.HIGH],
    default: TodoPriority.MEDIUM,
  })
  priority!: string;

  @Column({ type: 'uuid', nullable: true })
  assigneeId?: string | null;

  @ManyToOne(() => User, (u) => u.todos, { onDelete: 'SET NULL' })
  assignee?: User | null;

  // optimistic locking (EF Core-like)
  @VersionColumn()
  version!: number;

  @OneToMany(() => TodoDependency, (d) => d.todo)
  dependencies!: TodoDependency[];

  @OneToMany(() => TodoDependency, (d) => d.dependsOn)
  blocks!: TodoDependency[];
}
