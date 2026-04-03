import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SysUniversities } from '@entity/entities/SysUniversities.entity';

/**
 * Resolves **`uniName`** from CSV to **`SysUniversities.id`** (validation is separate).
 */
@Injectable()
export class CourseUniversityResolverService {
  async resolveUniversity(
    tm: EntityManager,
    uniNameRaw: string,
  ): Promise<{ uniId: string } | { error: string }> {
    const name = uniNameRaw.trim();
    const list = await tm
      .createQueryBuilder(SysUniversities, 'u')
      .where('TRIM(u.uniName) = TRIM(:name)', { name })
      .getMany();

    if (list.length === 0) {
      return { error: `University not found for uniName: "${name}"` };
    }
    if (list.length > 1) {
      return {
        error: `Ambiguous uniName: multiple universities match "${name}"`,
      };
    }
    return { uniId: list[0].id };
  }
}
