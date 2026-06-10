import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { Applications } from './Applications.entity';

/**
 * CRM notes attached to an application (flat, non-nested).
 */
@Index('IX_ApplicationNotes_applicationId', ['applicationId'])
@Entity('ApplicationNotes')
export class ApplicationNotes extends BaseEntity {
  @Column({
    name: 'applicationId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  applicationId!: string;

  @Column({
    name: 'description',
    type: 'varchar',
    length: 1000,
    nullable: false,
  })
  @AutoMap()
  description!: string;

  @Column({
    name: 'isResolved',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  @AutoMap()
  isResolved!: boolean;

  @Column({
    name: 'resolvedAt',
    type: 'timestamptz',
    nullable: true,
  })
  @AutoMap()
  resolvedAt?: Date | null;

  @Column({
    name: 'resolvedByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  resolvedByUserId?: string | null;

  @Column({
    name: 'createdByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  createdByUserId?: string | null;

  @Column({
    name: 'updatedByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  updatedByUserId?: string | null;

  // ========================================
  // Navigation Properties
  // ========================================

  @ManyToOne(() => Applications, (app) => app.ApplicationNotes, {
    nullable: false,
  })
  @JoinColumn({ name: 'applicationId' })
  Application!: Applications;
}
