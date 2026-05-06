import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SysProgrammes } from '@entity/entities/SysProgrammes.entity';
import { SysAcademicDegrees } from '@entity/entities/SysAcademicDegrees.entity';
import { COURSE_DEGREE_LEVEL_ORDER } from '../course-degree-level-order';
import {
  formatImportError,
  ImportErrorCode,
} from '../../common/abstractions/ImportErrorCode';

function normalizeDegreeKey(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Programme and academic degree lookup / create for course bulk import (resolution phase).
 */
@Injectable()
export class ProgrammeDegreeResolverService {
  async buildProgrammeCache(
    tm: EntityManager,
    names: string[],
  ): Promise<Map<string, string>> {
    const cache = new Map<string, string>();
    const unique = [...new Set(names.map((x) => x.trim()).filter(Boolean))];
    const repo = tm.getRepository(SysProgrammes);
    for (const name of unique) {
      const existing = await repo
        .createQueryBuilder('p')
        .where('LOWER(TRIM(p.name)) = LOWER(TRIM(:n))', { n: name })
        .getOne();
      if (existing) cache.set(name.toLowerCase(), existing.id);
    }
    return cache;
  }

  async buildDegreeCache(
    tm: EntityManager,
    names: string[],
  ): Promise<Map<string, string>> {
    const cache = new Map<string, string>();
    const unique = [...new Set(names.map((x) => x.trim()).filter(Boolean))];
    const repo = tm.getRepository(SysAcademicDegrees);
    for (const name of unique) {
      const existing = await repo
        .createQueryBuilder('d')
        .where('LOWER(TRIM(d.degreeName)) = LOWER(TRIM(:n))', { n: name })
        .getOne();
      if (existing) cache.set(name.toLowerCase(), existing.id);
    }
    return cache;
  }

  async findOrCreateProgramme(
    tm: EntityManager,
    nameRaw: string,
    cache?: Map<string, string>,
  ): Promise<{ id: string }> {
    const name = nameRaw.trim();
    const key = name.toLowerCase();
    const cached = cache?.get(key);
    if (cached) return { id: cached };
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
    cache?.set(key, created.id);
    return { id: created.id };
  }

  async findOrCreateDegree(
    tm: EntityManager,
    nameRaw: string,
    cache?: Map<string, string>,
  ): Promise<{ id: string } | { error: string }> {
    const name = nameRaw.trim();
    const key = name.toLowerCase();
    const cached = cache?.get(key);
    if (cached) return { id: cached };
    if (!name) {
      return {
        error: formatImportError(
          ImportErrorCode.UNKNOWN_DEGREE,
          'degree name is empty',
        ),
      };
    }
    const repo = tm.getRepository(SysAcademicDegrees);
    const existing = await repo
      .createQueryBuilder('d')
      .where('LOWER(TRIM(d.degreeName)) = LOWER(TRIM(:n))', { n: name })
      .getOne();
    if (existing) {
      cache?.set(key, existing.id);
      return { id: existing.id };
    }

    const normalizedKey = normalizeDegreeKey(name);
    const levelOrder = COURSE_DEGREE_LEVEL_ORDER[normalizedKey];
    if (levelOrder === undefined) {
      return {
        error: formatImportError(
          ImportErrorCode.UNKNOWN_DEGREE,
          `Unknown degree "${name}" for insert - add "${normalizedKey}" to course-degree-level-order.ts`,
        ),
      };
    }

    const created = repo.create({
      degreeName: name,
      levelOrder,
    });
    await repo.save(created);
    cache?.set(key, created.id);
    return { id: created.id };
  }
}
