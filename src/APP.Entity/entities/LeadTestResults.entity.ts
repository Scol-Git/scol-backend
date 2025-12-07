import { Entity, Column } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class LeadTestResults
 * @extends {BaseEntity}
 */
@Entity('LeadTestResults')
export class LeadTestResults extends BaseEntity {
  @Column({
    name: 'lead_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  leadId!: string;

  @Column({
    name: 'test_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  testId!: string;

  @Column({
    name: 'score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  score?: string;

  @Column({
    name: 'test_date',
    type: 'date',
    nullable: true,
  })
  @AutoMap()
  testDate?: Date;

  @Column({
    name: 'isVerified',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  @AutoMap()
  isVerified!: boolean;
}

