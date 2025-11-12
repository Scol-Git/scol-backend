import { BaseEntity } from './BaseEntity.template';
import { Column, Entity, ManyToOne, Unique, Index } from 'typeorm';
import { Todo } from './Todo.entity';

@Entity('todo_dependencies')
@Unique('UQ_dep_pair', ['todoId', 'dependsOnTodoId'])
@Index('IX_dep_depends_on', ['dependsOnTodoId'])
export class TodoDependency extends BaseEntity {
  @Column({ type: 'uuid' })
  todoId!: string;

  @Column({ type: 'uuid' })
  dependsOnTodoId!: string;

  @ManyToOne(() => Todo, (t) => t.dependencies, { onDelete: 'CASCADE' })
  todo!: Todo;

  @ManyToOne(() => Todo, (t) => t.blocks, { onDelete: 'CASCADE' })
  dependsOn!: Todo;
}
