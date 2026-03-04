import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { UniCourses } from './UniCourses.entity';
import { SysDocumentTypes } from './SysDocumentTypes.entity';

/**
 * @class CourseRequiredDocuments
 * @extends {BaseEntity}
 * Document types required for a course (e.g. transcript, SOP), with constraints.
 */
@Entity('CourseRequiredDocuments')
@Index('IX_CourseRequiredDocuments_uniCourseId', ['uniCourseId'])
@Index('IX_CourseRequiredDocuments_documentTypeId', ['documentTypeId'])
export class CourseRequiredDocuments extends BaseEntity {
  @Column({
    name: 'uniCourseId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  uniCourseId!: string;

  @Column({
    name: 'documentTypeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  documentTypeId!: string;

  @Column({
    name: 'isRequired',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  @AutoMap()
  isRequired!: boolean;

  @Column({
    name: 'allowedMimeTypes',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  allowedMimeTypes?: string;

  @Column({
    name: 'maxFileSizeBytes',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  maxFileSizeBytes?: number;

  @Column({
    name: 'minCount',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  minCount?: number;

  @Column({
    name: 'maxCount',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  maxCount?: number;

  @Column({
    name: 'notes',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  notes?: string;

  // ========================================
  // Navigation
  // ========================================

  @ManyToOne(() => UniCourses, (c) => c.CourseRequiredDocument)
  @JoinColumn({ name: 'uniCourseId' })
  UniCourse!: UniCourses;

  @ManyToOne(() => SysDocumentTypes)
  @JoinColumn({ name: 'documentTypeId' })
  SysDocumentType!: SysDocumentTypes;
}
