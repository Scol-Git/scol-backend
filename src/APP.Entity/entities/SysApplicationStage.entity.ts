import { Entity, Column, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class SysApplicationStage
 * @extends {BaseEntity}
 * Reference table for application stage (e.g. Documents, Review, Decision).
 */
@Entity('sys_ApplicationStage')
@Index('IX_SysApplicationStage_stageCode', ['stageCode'], { unique: true })
@Index('IX_SysApplicationStage_stageOrder', ['stageOrder'])
export class SysApplicationStage extends BaseEntity {
  @Column({
    name: 'stageCode',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @AutoMap()
  stageCode!: string;

  @Column({
    name: 'stageName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  stageName!: string;

  @Column({
    name: 'stageOrder',
    type: 'int',
    nullable: false,
    default: 0,
  })
  @AutoMap()
  stageOrder!: number;

  @Column({
    name: 'isTerminal',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  @AutoMap()
  isTerminal!: boolean;
}
