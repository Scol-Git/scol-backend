import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysUniversities } from './SysUniversities.entity';
import { SysApplicationStage } from './SysApplicationStage.entity';

/**
 * University-specific display ordering of application stages.
 * Does not affect the global application workflow.
 */
@Index('UQ_UniApplicationStage_uni_stage', ['uniId', 'sysApplicationStageId'], {
  unique: true,
})
@Index('IX_UniApplicationStage_uni_displayOrder', ['uniId', 'displayOrder'])
@Entity('UniApplicationStage')
export class UniApplicationStage extends BaseEntity {
  @Column({
    name: 'uniId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  uniId!: string;

  @Column({
    name: 'sysApplicationStageId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysApplicationStageId!: string;

  @Column({
    name: 'displayOrder',
    type: 'int',
    nullable: false,
  })
  @AutoMap()
  displayOrder!: number;

  @Column({
    name: 'isEnabled',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  @AutoMap()
  isEnabled!: boolean;

  @ManyToOne(() => SysUniversities, (uni) => uni.UniApplicationStage, {
    nullable: false,
  })
  @JoinColumn({ name: 'uniId' })
  SysUniversity!: SysUniversities;

  @ManyToOne(
    () => SysApplicationStage,
    (stage) => stage.UniApplicationStage,
    { nullable: false },
  )
  @JoinColumn({ name: 'sysApplicationStageId' })
  SysApplicationStage!: SysApplicationStage;
}
