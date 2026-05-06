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
    for (const name of keys) {
      const rows = await tm
        .createQueryBuilder(SysUniversities, 'u')
        .select(['u.id'])
        .where('LOWER(TRIM(u.uniName)) = LOWER(TRIM(:name))', { name })
        .getMany();
      cache.set(name.toLowerCase(), rows.map((row) => row.id));
    }
    return cache;
  }

  async resolveUniversity(
    tm: EntityManager,
    uniNameRaw: string,
    cache?: Map<string, string[]>,
  ): Promise<{ uniId: string } | { error: string }> {
    const name = uniNameRaw.trim();
    const cacheKey = name.toLowerCase();
    const cached = cache?.get(cacheKey);
    const list =
      cached !== undefined
        ? cached.map((id) => ({ id }))
        : await tm
            .createQueryBuilder(SysUniversities, 'u')
            .where('LOWER(TRIM(u.uniName)) = LOWER(TRIM(:name))', { name })
            .getMany();

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
