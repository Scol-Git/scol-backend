import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { AutoMap } from '@automapper/classes';

import { BaseEntity } from './BaseEntity.template';
import { Organization } from './Organization.entity';

@Entity('audit_events')
@Index('IX_audit_org', ['orgId'])
@Index('IX_audit_entity', ['entityType', 'entityId'])
export class AuditEvent extends BaseEntity {
  @Column({ type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => Organization, (o) => o.audit, { onDelete: 'CASCADE' })
  org!: Organization;

  @Column({ type: 'uuid', nullable: true })
  actorUserId?: string | null;

  @Column({ type: 'varchar', length: 200 })
  action!: string; // e.g., 'todo.created'

  @Column({ type: 'varchar', length: 100 })
  entityType!: string; // e.g., 'TodoItem'

  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;
}
