import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  @AutoMap()
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  @AutoMap()
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  @AutoMap()
  updatedAt!: Date;
}
