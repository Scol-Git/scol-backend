import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { ApplicationActivityType } from '@shared/enums/ApplicationActivityType.enum';
import { ApplicationActivityEntityType } from '@shared/enums/ApplicationActivityEntityType.enum';
import { BaseEntity } from './BaseEntity.template';
import { Applications } from './Applications.entity';

/**
 * Timeline / audit rows for the application journey.
 */
@Index('IX_ApplicationActivities_applicationId', ['applicationId'])
@Entity('ApplicationActivities')
export class ApplicationActivities extends BaseEntity {
  @Column({
    name: 'applicationId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  applicationId!: string;

  @Column({
    name: 'activityType',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  @AutoMap()
  activityType!: ApplicationActivityType;

  @Column({
    name: 'entityType',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  @AutoMap()
  entityType!: ApplicationActivityEntityType;

  @Column({
    name: 'entityId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  entityId!: string;

  @Column({
    name: 'stageId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  stageId?: string;

  @Column({
    name: 'statusId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  statusId?: string;

  @Column({
    name: 'documentRequirementId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  documentRequirementId?: string;

  @Column({
    name: 'applicationDocumentId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  applicationDocumentId?: string;

  @Column({
    name: 'documentVersionId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  documentVersionId?: string;

  @Column({
    name: 'fromValue',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  fromValue?: string;

  @Column({
    name: 'toValue',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  toValue?: string;

  @Column({
    name: 'remarks',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  remarks?: string;

  @Column({ name: 'metaData', type: 'jsonb', nullable: true })
  @AutoMap()
  metaData?: Record<string, unknown>;

  @Column({
    name: 'actedByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  actedByUserId?: string;

  // ========================================
  // Navigation Properties
  // ========================================

  @ManyToOne(() => Applications, (app) => app.ApplicationActivities, {
    nullable: false,
  })
  @JoinColumn({ name: 'applicationId' })
  Application!: Applications;
}
