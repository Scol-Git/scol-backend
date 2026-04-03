import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SysProgrammes } from '@entity/entities/SysProgrammes.entity';
import { SysAcademicDegrees } from '@entity/entities/SysAcademicDegrees.entity';
import { COURSE_DEGREE_LEVEL_ORDER } from '../course-degree-level-order';

function normalizeDegreeKey(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Programme and academic degree lookup / create for course bulk import (resolution phase).
 */
@Injectable()
export class ProgrammeDegreeResolverService {
  async findOrCreateProgramme(
    tm: EntityManager,
    nameRaw: string,
  ): Promise<{ id: string }> {
    const name = nameRaw.trim();
    const repo = tm.getRepository(SysProgrammes);
    const existing = await repo
      .createQueryBuilder('p')
      .where('LOWER(TRIM(p.name)) = LOWER(TRIM(:n))', { n: name })
      .getOne();
    if (existing) {
      return { id: existing.id };
    }
    const created = repo.create({ name });
    await repo.save(created);
    return { id: created.id };
  }

  async findOrCreateDegree(
    tm: EntityManager,
    nameRaw: string,
  ): Promise<{ id: string } | { error: string }> {
    const name = nameRaw.trim();
    if (!name) {
      return { error: 'degree name is empty' };
    }
    const repo = tm.getRepository(SysAcademicDegrees);
    const existing = await repo
      .createQueryBuilder('d')
      .where('LOWER(TRIM(d.degreeName)) = LOWER(TRIM(:n))', { n: name })
      .getOne();
    if (existing) {
      return { id: existing.id };
    }

    const key = normalizeDegreeKey(name);
    const levelOrder = COURSE_DEGREE_LEVEL_ORDER[key];
    if (levelOrder === undefined) {
      return {
        error: `Unknown degree "${name}" for insert — add "${key}" to course-degree-level-order.ts`,
      };
    }

    const created = repo.create({
      degreeName: name,
      levelOrder,
    });
    await repo.save(created);
    return { id: created.id };
  }
}
