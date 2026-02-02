import { Entity, Column, OneToMany } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { UniIntakes } from './UniIntakes.entity';

/**
 * @class SysIntakes
 * @extends {BaseEntity}
 */
@Entity('sys_Intakes')
export class SysIntakes extends BaseEntity {
  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  name!: string;

  @Column({
    name: 'intakeMonth',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  intakeMonth?: number;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * One-to-Many: University intakes
   * All university intake associations for this intake type
   */
  @OneToMany(() => UniIntakes, (uniIntake) => uniIntake.SysIntake)
  UniIntake!: UniIntakes[];
}
