import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysStates } from './SysStates.entity';

/**
 * @class SysCities
 * @extends {BaseEntity}
 */
@Entity('sys_Cities')
export class SysCities extends BaseEntity {
  @Column({
    name: 'sysStateId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysStateId!: string;

  @Column({
    name: 'cityName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  cityName!: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: State
   * Each city belongs to one state
   */
  @ManyToOne(() => SysStates, (state) => state.cities)
  @JoinColumn({ name: 'sysStateId' })
  state!: SysStates;
}
