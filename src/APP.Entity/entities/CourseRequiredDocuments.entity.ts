import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { UniCourses } from './UniCourses.entity';
import { SysDocumentTypes } from './SysDocumentTypes.entity';

/**
 * Document requirements configured at course level.
 */
@Index('IX_CourseRequiredDocuments_uniCourseId', ['uniCourseId'])
@Index('IX_CourseRequiredDocuments_documentTypeId', ['documentTypeId'])
@Entity('CourseRequiredDocuments')
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
    nullable: true,
  })
  @AutoMap()
  isRequired?: boolean;

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
    name: 'remarks',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  remarks?: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  @ManyToOne(() => UniCourses, (course) => course.CourseRequiredDocuments, {
    nullable: false,
  })
  @JoinColumn({ name: 'uniCourseId' })
  UniCourse!: UniCourses;

  @ManyToOne(() => SysDocumentTypes, (dt) => dt.CourseRequiredDocuments, {
    nullable: false,
  })
  @JoinColumn({ name: 'documentTypeId' })
  SysDocumentType!: SysDocumentTypes;
}
