import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  @AutoMap()
  id!: string;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  @AutoMap()
  createdAt!: Date;

  @Index()
  @UpdateDateColumn({ type: 'timestamptz' })
  @AutoMap()
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  @AutoMap()
  deletedAt?: Date | null;
}
