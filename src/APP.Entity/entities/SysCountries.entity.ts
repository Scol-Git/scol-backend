import { Entity, Column } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class SysCountries
 * @extends {BaseEntity}
 */
@Entity('sys_Countries')
export class SysCountries extends BaseEntity {
  @Column({
    name: 'countryName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  countryName!: string;
}
