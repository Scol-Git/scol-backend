import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ICacheService as ICacheToken, ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import type { ICacheService } from '@shared/interfaces/infrastructure';
import type { ILogger } from '@shared/interfaces/logging';
import { BulkImportStatus } from '@shared/enums/crm/BulkImportStatus.enum';
import { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';
import type { PublishPreviewResponseDto } from '@shared/dtos/crm/bulk-imports/PublishPreviewResponseDto';
import type { PublishResultResponseDto } from '@shared/dtos/crm/bulk-imports/PublishResultResponseDto';
import { SearchCacheInvalidationService } from '@bll/services/search/shared/cache/SearchCacheInvalidationService';
import { SearchCacheKeyBuilder } from '@bll/services/search/shared/cache/SearchCacheKeyBuilder';
import { runInTx } from '@bll/crm-services/bulk-imports/common/inTx';
import { PublishReadinessChecker } from './PublishReadinessChecker';
import { PublishRepository, chainCounts, type PublishChain } from './PublishRepository';

const ZERO_COUNTS = { intakes: 0, courses: 0, universities: 0, programmes: 0, countries: 0, states: 0, cities: 0 };

@Injectable()
export class PublishService {
  constructor(
    private readonly db: AppDbContext,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly repo: PublishRepository,
    private readonly readiness: PublishReadinessChecker,
    private readonly searchCache: SearchCacheInvalidationService,
    @Inject(ICacheToken) private readonly cache: ICacheService,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  // ------------------------------------------------------------ batch

  async previewBatch(batchId: string): Promise<PublishPreviewResponseDto> {
    const batch = await this.getBatchOrThrow(batchId);
    if (batch.status !== BulkImportStatus.IN_REVIEW) {
      throw new ConflictException('Only batches in review can be published');
    }
    return this.dataSource.manager.transaction(async (em) => {
      const chain = await this.collectForBatch(em, batch.type, batchId);
      const blockingIssues = await this.readiness.check(em, chain);
      const counts = chainCounts(chain);
      return {
        counts,
        blockingIssues,
        canPublish: blockingIssues.length === 0 && counts.intakes + counts.universities > 0,
      };
    });
  }

  async publishBatch(batchId: string, userId: string): Promise<PublishResultResponseDto> {
    const batch = await this.getBatchOrThrow(batchId);
    const publishedAt = new Date();

    const counts = await runInTx(this.dataSource, async (em) => {
      // Guard + row lock: a double click waits here and then sees status PUBLISHED.
      const guard = (await em.query(
        `UPDATE "BulkImportBatches" SET "updatedAt" = now()
         WHERE id = $1 AND status = 'IN_REVIEW' AND "deletedAt" IS NULL RETURNING id`,
        [batchId],
      )) as unknown as [Array<{ id: string }>, number];
      if (!guard[0]?.length) throw new ConflictException('Only batches in review can be published');

      const chain = await this.collectForBatch(em, batch.type, batchId);
      const blockingIssues = await this.readiness.check(em, chain);
      if (blockingIssues.length > 0) {
        throw new UnprocessableEntityException({
          message: 'Some items are not ready to publish',
          blockingIssues,
        });
      }

      await this.repo.publishChain(em, chain, userId);
      const c = chainCounts(chain);
      await em.query(
        `UPDATE "BulkImportBatches"
         SET status = 'PUBLISHED', "publishedAt" = now(), "publishedBy" = $2, "publishedCount" = $3, "updatedAt" = now()
         WHERE id = $1`,
        [batchId, userId, batch.type === BulkImportType.COURSE ? c.intakes : c.universities],
      );
      return c;
    });

    await this.invalidateLeadCaches(); // once per action
    this.logger.LogInfo('Bulk import published', { batchId, ...counts });
    return { counts, publishedAt: publishedAt.toISOString() };
  }

  async discardBatch(batchId: string): Promise<void> {
    const batch = await this.getBatchOrThrow(batchId);
    const allowed = [BulkImportStatus.IN_REVIEW, BulkImportStatus.NO_CHANGES, BulkImportStatus.FAILED];
    if (!allowed.includes(batch.status)) {
      throw new ConflictException('Only batches in review, without changes, or failed can be discarded');
    }
    await runInTx(this.dataSource, async (em) => {
      if (batch.type === BulkImportType.COURSE) await this.repo.discardCourseBatch(em, batchId);
      else await this.repo.discardUniversityBatch(em, batchId);
      await em.query(
        `UPDATE "BulkImportBatches" SET status = 'DISCARDED', "updatedAt" = now() WHERE id = $1`,
        [batchId],
      );
    });
    // Drafts were never visible to Leads: no cache invalidation needed.
    this.logger.LogInfo('Bulk import discarded', { batchId });
  }

  // ------------------------------------------------------- university

  async previewUniversity(uniId: string): Promise<PublishPreviewResponseDto> {
    await this.getUniversityOrThrow(uniId);
    return this.dataSource.manager.transaction(async (em) => {
      const chain = await this.repo.collectSingleUniversityChain(em, uniId);
      const blockingIssues = await this.readiness.check(em, { universityIds: chain.universityIds });
      const counts = chainCounts(chain);
      return { counts, blockingIssues, canPublish: blockingIssues.length === 0 && counts.universities > 0 };
    });
  }

  async publishUniversity(uniId: string, userId: string): Promise<PublishResultResponseDto> {
    const uni = await this.getUniversityOrThrow(uniId);
    const publishedAt = new Date();
    if (uni.isPublished) return { counts: { ...ZERO_COUNTS }, publishedAt: publishedAt.toISOString() }; // idempotent

    const counts = await runInTx(this.dataSource, async (em) => {
      const chain = await this.repo.collectSingleUniversityChain(em, uniId);
      const blockingIssues = await this.readiness.check(em, { universityIds: chain.universityIds });
      if (blockingIssues.length > 0) {
        throw new UnprocessableEntityException({
          message: 'Some items are not ready to publish',
          blockingIssues,
        });
      }
      await this.repo.publishChain(em, chain, userId);
      return chainCounts(chain);
    });

    await this.invalidateLeadCaches();
    this.logger.LogInfo('University published', { uniId, ...counts });
    return { counts, publishedAt: publishedAt.toISOString() };
  }

  async deleteDraftUniversity(uniId: string): Promise<void> {
    const uni = await this.getUniversityOrThrow(uniId);
    if (uni.isPublished || uni.publishedAt != null) {
      throw new ConflictException('Only never-published drafts can be deleted');
    }
    await runInTx(this.dataSource, async (em) => {
      const courses = (await em.query(
        `SELECT 1 FROM "UniCourses" WHERE "uniId" = $1 AND "deletedAt" IS NULL LIMIT 1`,
        [uniId],
      )) as unknown[];
      if (courses.length > 0) throw new ConflictException('Delete its courses first');
      await em.query(`DELETE FROM "UniApplicationStage" WHERE "uniId" = $1`, [uniId]);
      await em.query(`DELETE FROM "UniAcademicReq" WHERE "uniId" = $1`, [uniId]);
      await em.query(`DELETE FROM "UniEngReq" WHERE "uniId" = $1`, [uniId]);
      await em.query(`DELETE FROM "sys_Universities" WHERE id = $1`, [uniId]);
    });
  }

  // ------------------------------------------------------ course intake

  /** `courseIntakeId` is the CRM API `courseId` (UniCourseIntakes.id). */
  async deleteDraftCourseIntake(courseIntakeId: string): Promise<void> {
    const intake = await this.db.courseIntakes.findOne({
      where: { id: courseIntakeId },
      select: { id: true, uniCourseId: true, isPublished: true, publishedAt: true },
    });
    if (!intake) throw new NotFoundException('Course not found');
    if (intake.isPublished || intake.publishedAt != null) {
      throw new ConflictException('Only never-published drafts can be deleted');
    }
    await runInTx(this.dataSource, async (em) => {
      await em.query(`DELETE FROM "CourseIntakeScholarships" WHERE "courseIntakeId" = $1`, [courseIntakeId]);
      await em.query(`DELETE FROM "UniCourseIntakes" WHERE id = $1`, [courseIntakeId]);
      const courseId = intake.uniCourseId;
      const course = (await em.query(
        `SELECT "isPublished", "publishedAt" FROM "UniCourses" WHERE id = $1`,
        [courseId],
      )) as Array<{ isPublished: boolean; publishedAt: Date | null }>;
      const remaining = (await em.query(
        `SELECT 1 FROM "UniCourseIntakes" WHERE "uniCourseId" = $1 LIMIT 1`,
        [courseId],
      )) as unknown[];
      if (course[0] && !course[0].isPublished && course[0].publishedAt == null && remaining.length === 0) {
        await em.query(`DELETE FROM "CourseEngReq" WHERE "uniCourseId" = $1`, [courseId]);
        await em.query(`DELETE FROM "CourseRequiredDocuments" WHERE "uniCourseId" = $1`, [courseId]);
        await em.query(`DELETE FROM "UniCourses" WHERE id = $1`, [courseId]);
      }
    });
  }

  // ---------------------------------------------------------- helpers

  private collectForBatch(em: EntityManager, type: BulkImportType, batchId: string): Promise<PublishChain> {
    return type === BulkImportType.COURSE
      ? this.repo.collectCourseBatchChain(em, batchId)
      : this.repo.collectUniversityBatchChain(em, batchId);
  }

  private async invalidateLeadCaches(): Promise<void> {
    await this.searchCache.invalidateAllSearchResults();
    await this.cache.remove(SearchCacheKeyBuilder.forFilterOptions('advanced'));
  }

  private async getBatchOrThrow(batchId: string) {
    const batch = await this.db.bulkImportBatches.findOne({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Bulk import batch not found');
    return batch;
  }

  private async getUniversityOrThrow(uniId: string) {
    const uni = await this.db.universities.findOne({ where: { id: uniId } });
    if (!uni) throw new NotFoundException('University not found');
    return uni;
  }
}
