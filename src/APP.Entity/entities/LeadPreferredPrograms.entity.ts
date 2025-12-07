import { Entity, Column } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class LeadPreferredPrograms
 * @extends {BaseEntity}
 */
@Entity('LeadPreferredPrograms')
export class LeadPreferredPrograms extends BaseEntity {
  @Column({
    name: 'lead_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  leadId!: string;

  @Column({
    name: 'country_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  countryId!: string;
}

