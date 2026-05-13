import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SysUniversities } from '@entity/entities/SysUniversities.entity';
import {
  formatImportError,
  ImportErrorCode,
} from '../../common/abstractions/ImportErrorCode';

/**
 * Resolves **`uniName`** from CSV to **`SysUniversities.id`** (validation is separate).
 */
@Injectable()
export class CourseUniversityResolverService {
  async buildCache(
    tm: EntityManager,
    uniNames: string[],
  ): Promise<Map<string, string[]>> {
    const keys = [...new Set(uniNames.map((name) => name.trim()).filter(Boolean))];
    const cache = new Map<string, string[]>();
    if (keys.length === 0) return cache;
    const lowered = keys.map((k) => k.toLowerCase());
    const rows = await tm
      .createQueryBuilder(SysUniversities, 'u')
      .select(['u.id', 'u.uniName'])
      .where('LOWER(TRIM(u.uniName)) IN (:...names)', { names: lowered })
      .getMany();
    for (const row of rows) {
      const k = row.uniName.trim().toLowerCase();
      const list = cache.get(k) ?? [];
      list.push(row.id);
      cache.set(k, list);
    }
    return cache;
  }

  /**
   * Resolves using only `cache` (from {@link buildCache}). Callers must pre-fetch; no DB fallback.
   */
  async resolveUniversity(
    uniNameRaw: string,
    cache: Map<string, string[]>,
  ): Promise<{ uniId: string } | { error: string }> {
    const name = uniNameRaw.trim();
    const ids = cache.get(name.toLowerCase()) ?? [];
    const list = ids.map((id) => ({ id }));

    if (list.length === 0) {
      return {
        error: formatImportError(
          ImportErrorCode.UNIVERSITY_NOT_FOUND,
          `University not found for uniName: "${name}"`,
        ),
      };
    }
    if (list.length > 1) {
      return {
        error: formatImportError(
          ImportErrorCode.AMBIGUOUS_UNIVERSITY,
          `Ambiguous uniName: multiple universities match "${name}"`,
        ),
      };
    }
    return { uniId: list[0].id };
  }
}
