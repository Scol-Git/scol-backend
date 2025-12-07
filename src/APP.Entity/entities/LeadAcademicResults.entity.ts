import { Entity, Column } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class LeadAcademicResults
 * @extends {BaseEntity}
 */
@Entity('LeadAcademicResults')
export class LeadAcademicResults extends BaseEntity {
  @Column({
    name: 'lead_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  leadId!: string;

  @Column({
    name: 'degree_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  degreeId!: string;

  @Column({
    name: 'institute',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  institute!: string;

  @Column({
    name: 'gpa',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  @AutoMap()
  gpa?: string;

  @Column({
    name: 'passing_date',
    type: 'date',
    nullable: true,
  })
  @AutoMap()
  passingDate?: Date;

  @Column({
    name: 'isVerified',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  @AutoMap()
  isVerified!: boolean;
}

