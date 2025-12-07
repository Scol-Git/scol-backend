import { Entity, Column } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class SysAcademicDegrees
 * @extends {BaseEntity}
 */
@Entity('sys_AcademicDegrees')
export class SysAcademicDegrees extends BaseEntity {
  @Column({
    name: 'degreeName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  degreeName!: string;
}

