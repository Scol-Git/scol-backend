import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class SysLeadProfiles
 * @extends {BaseEntity}
 */
@Entity('sys_LeadProfiles')
export class SysLeadProfiles extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'lead_id' })
  @AutoMap()
  override id!: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  userId!: string;

  @Column({
    name: 'fullName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  fullName!: string;

  @Column({
    name: 'dob',
    type: 'date',
    nullable: true,
  })
  @AutoMap()
  dob?: Date;

  @Column({
    name: 'gender',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  gender?: string;

  @Column({
    name: 'address',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  address?: string;

  @Column({
    name: 'city',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  city?: string;

  @Column({
    name: 'imgUrl',
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  @AutoMap()
  imgUrl?: string;
}

