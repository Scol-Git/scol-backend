import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysLeadProfiles } from './SysLeadProfiles.entity';
import { UniCourseIntakes } from './UniCourseIntakes.entity';

/**
 * @class LeadFavouriteCourses
 * @extends {BaseEntity}
 *
 * Per-lead favourite (heart) on a specific course intake.
 *
 * **Indexes:**
 * - Unique (leadId, courseIntakeId): atomic upsert + duplicate prevention
 * - (leadId, createdAt DESC, id DESC): GET /wishlist cursor pagination
 *
 * **FK behaviour:**
 * - lead_id    -> sys_LeadProfiles.id  ON DELETE CASCADE
 * - courseIntakeId -> UniCourseIntakes.id ON DELETE CASCADE
 */
@Entity('LeadFavouriteCourses')
@Index('UQ_LeadFavouriteCourses_lead_intake', ['leadId', 'courseIntakeId'], {
  unique: true,
})
@Index('IX_LeadFavouriteCourses_lead_createdAt', [
  'leadId',
  'createdAt',
  'id',
])
export class LeadFavouriteCourses extends BaseEntity {
  @Column({
    name: 'lead_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  leadId!: string;

  @Column({
    name: 'courseIntakeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  courseIntakeId!: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: Lead profile
   * Each favourite belongs to one lead profile.
   */
  @ManyToOne(() => SysLeadProfiles, (lead) => lead.LeadFavouriteCourse, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lead_id' })
  SysLeadProfile!: SysLeadProfiles;

  /**
   * Many-to-One: Course intake
   * Each favourite points to one course intake.
   */
  @ManyToOne(
    () => UniCourseIntakes,
    (intake) => intake.LeadFavouriteCourse,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'courseIntakeId' })
  UniCourseIntake!: UniCourseIntakes;
}
