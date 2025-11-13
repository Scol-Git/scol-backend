import { Column, Entity, OneToMany } from 'typeorm';
import { AutoMap } from '@automapper/classes';

import { BaseEntity } from './BaseEntity.template';
import { User } from './User.entity';
import { Project } from './Project.entity';
import { AuditEvent } from './AuditEvent.entity';

@Entity('organizations')
export class Organization extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  @AutoMap()
  name!: string;

  @OneToMany(() => User, (u) => u.org)
  users!: User[];

  @OneToMany(() => Project, (p) => p.org)
  projects!: Project[];

  @OneToMany(() => AuditEvent, (a) => a.org)
  audit!: AuditEvent[];
}
