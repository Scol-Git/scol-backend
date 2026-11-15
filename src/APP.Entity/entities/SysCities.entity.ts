import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysStates } from './SysStates.entity';

/**
 * @class SysCities
 * @extends {BaseEntity}
 */
// Natural-key unique index lives in migration bulk-import-indexes (expression index).
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
  // Publish / import tracking (bulk import draft -> publish)
  // ========================================

  @Column({ name: 'isPublished', type: 'boolean', nullable: false, default: true })
  @AutoMap()
  isPublished!: boolean;

  @Column({ name: 'publishedAt', type: 'timestamptz', nullable: true })
  @AutoMap()
  publishedAt?: Date | null;

  @Column({ name: 'publishedBy', type: 'uuid', nullable: true })
  @AutoMap()
  publishedBy?: string | null;

  @Column({ name: 'importBatchId', type: 'uuid', nullable: true })
  @AutoMap()
  importBatchId?: string | null;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: State
   * Each city belongs to one state
   */
  @ManyToOne(() => SysStates, (state) => state.SysCity)
  @JoinColumn({ name: 'sysStateId' })
  SysState!: SysStates;
}
