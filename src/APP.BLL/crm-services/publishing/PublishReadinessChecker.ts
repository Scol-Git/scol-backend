import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { COURSE_SCHEMA } from '@bll/crm-services/bulk-imports/course/course.schema';
import { UNIVERSITY_SCHEMA } from '@bll/crm-services/bulk-imports/university/university.schema';
import type { ImportColumn } from '@bll/crm-services/bulk-imports/schema/defineImportSchema';
import type { BlockingIssueDto } from '@shared/dtos/crm/bulk-imports/PublishPreviewResponseDto';

export type ReadinessEntity = 'university' | 'course' | 'intake';

export interface ReadinessIds {
  universityIds?: string[];
  courseIds?: string[];
  intakeIds?: string[];
}

interface PublishColumn {
  /** DB column on the entity's table (from the schema `field`). */
  column: string;
  /** CSV header reported to the user. */
  header: string;
}

/** Only identifiers coming from the schema constants are ever interpolated. */
const SAFE_IDENT = /^[A-Za-z][A-Za-z0-9]*$/;

/** Derives the `required: 'publish'` columns of an entity from the schemas. Never hard-coded. */
function publishColumns(entity: ReadinessEntity): PublishColumn[] {
  const cols: readonly ImportColumn[] = [...UNIVERSITY_SCHEMA.columns, ...COURSE_SCHEMA.columns];
  return cols
    .filter((c) => c.required === 'publish' && c.entity === entity)
    .map((c) => ({ column: c.field, header: c.header }));
}

export const PUBLISH_COLUMNS: Record<ReadinessEntity, PublishColumn[]> = {
  university: publishColumns('university'),
  course: publishColumns('course'),
  intake: publishColumns('intake'),
};

function missingExpr(alias: string, cols: PublishColumn[]): string {
  const cases = cols.map((c) => {
    if (!SAFE_IDENT.test(c.column)) throw new Error(`Unsafe column in schema: ${c.column}`);
    const header = c.header.replace(/'/g, "''");
    return `CASE WHEN ${alias}."${c.column}" IS NULL OR btrim(${alias}."${c.column}"::text) = '' THEN '${header}' END`;
  });
  return cases.length ? `array_remove(ARRAY[${cases.join(', ')}]::text[], NULL)` : `'{}'::text[]`;
}

type Row = { id: string; name: string; missing: string[] };

@Injectable()
export class PublishReadinessChecker {
  /** One query per entity type. Returns only items with missing required-for-publish fields. */
  async check(em: EntityManager, ids: ReadinessIds): Promise<BlockingIssueDto[]> {
    const issues: BlockingIssueDto[] = [];
    const push = (entity: ReadinessEntity, rows: Row[]) => {
      for (const r of rows) {
        if (r.missing?.length) issues.push({ entity, id: r.id, name: r.name, missingFields: r.missing });
      }
    };

    if (ids.universityIds?.length) {
      push('university', await em.query(
        `SELECT u.id, u."uniName" AS name, ${missingExpr('u', PUBLISH_COLUMNS.university)} AS missing
         FROM "sys_Universities" u WHERE u.id = ANY($1::uuid[])`,
        [ids.universityIds],
      ));
    }
    if (ids.courseIds?.length) {
      push('course', await em.query(
        `SELECT c.id, c."courseName" AS name, ${missingExpr('c', PUBLISH_COLUMNS.course)} AS missing
         FROM "UniCourses" c WHERE c.id = ANY($1::uuid[])`,
        [ids.courseIds],
      ));
    }
    if (ids.intakeIds?.length) {
      push('intake', await em.query(
        `SELECT ci.id, c."courseName" || ' ' || ci."intakeMonth" || '/' || ci."intakeYear" AS name,
                ${missingExpr('ci', PUBLISH_COLUMNS.intake)} AS missing
         FROM "UniCourseIntakes" ci JOIN "UniCourses" c ON c.id = ci."uniCourseId"
         WHERE ci.id = ANY($1::uuid[])`,
        [ids.intakeIds],
      ));
    }
    return issues;
  }
}
