import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { LeadFavouriteCourses } from '@entity/entities/LeadFavouriteCourses.entity';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';

import { ICacheService } from '@shared/interfaces/infrastructure';
import { IApplicationConfig } from '@shared/interfaces/config/IApplicationConfig.interface';
import { ILogger } from '@shared/interfaces/logging';
import {
  ICacheService as ICacheServiceToken,
  IApplicationConfig as IApplicationConfigToken,
  ILogger as ILoggerToken,
} from '@shared/tokens/injection.tokens';

import { WishlistsResponseDto } from '@shared/dtos/wishlists/WishlistsResponseDto';
import { InactiveCourseIntakeException } from '@shared/exceptions/wishlist/InactiveCourseIntakeException';
import { LeadProfileNotFoundException } from '@shared/exceptions/wishlist/LeadProfileNotFoundException';
import { WishlistLimitReachedException } from '@shared/exceptions/wishlist/WishlistLimitReachedException';

import { WishlistMapper } from './WishlistMapper';

/** Cached payload for the per-user wishlist Redis Set. */
interface CachedWishlistIds {
  ids: string[];
}

/** Redis key prefix for the per-lead wishlist Set. */
const CACHE_KEY_PREFIX = 'wishlist:lead:';

/** TTL for the per-lead wishlist Set (seconds). Backstop in case a write path is bypassed. */
const CACHE_TTL_SECONDS = 60;

/**
 * Wishlist (favourite courses) service.
 *
 * Manages the LEAD-owned wishlist of `UniCourseIntakes`. All mutations are
 * idempotent and atomic where it matters for correctness.
 *
 * - `addToWishlist` -- cap-checked upsert serialized per lead inside a DB
 *   transaction (`pg_advisory_xact_lock`) so concurrent adds cannot bypass
 *   `WISHLIST_PER_USER_LIMIT`.
 * - `removeFromWishlist` -- row delete wrapped in Postgres `transaction()` for easy
 *   extension (audit, side-effects). **Deliberately no `pg_advisory_xact_lock`:** the
 *   cap invariant lives only on add; DELETE does not need per-lead serialization and
 *   skipping the lock avoids blocking concurrent adds behind a slow remove.
 * - `getMyWishlist` -- one relational query (`QueryBuilder`): inner join to
 *   active, non-deleted intakes plus eager-loaded graph (avoids flaky nested
 *   `find` relation filters / LEFT-null intake rows).
 * - `getWishlistedIntakeIds` -- per-user Redis Set with DB fallback;
 *   used by `WishlistMarker` to flag `isWishlisted` on `/home`.
 *
 * **Redis vs Postgres:** Mutation paths call `invalidateWishlistCacheBestEffort`
 * after the DB succeeds. Redis has no atomic join with Postgres; cache invalidation
 * is intentionally best-effort. If the process dies after COMMIT before Redis clears,
 * callers may observe stale hearts until `wishlist:lead:{leadId}` TTL expiry (see
 * `CACHE_TTL_SECONDS`) or the next explicit invalidation.
 */
@Injectable()
export class WishlistService {
  constructor(
    private readonly db: AppDbContext,
    private readonly mapper: WishlistMapper,
    @Inject(ICacheServiceToken) private readonly cache: ICacheService,
    @Inject(IApplicationConfigToken)
    private readonly appConfig: IApplicationConfig,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  // =========================================================================
  // Public API
  // =========================================================================

  /**
   * Add a course intake to the current user's wishlist.
   *
   * Idempotent upsert: re-adds skip the cap. Concurrent new adds are
   * serialized per lead so two requests cannot both pass `count < limit`.
   *
   * Runs an intake **preflight** only when `(leadId, courseIntakeId)` is **not**
   * yet wishlisted (`UQ_LeadFavouriteCourses_lead_intake` lookup) so hearts do not pay
   * an extra intake read on idempotent re-add. After `pg_advisory_xact_lock`,
   * `ensureIntakeBookableOrThrow` still re-reads the intake inside the txn (authoritative).
   *
   * **Pre-txn round-trips:** A **first** add hits up to three **sequential** DB reads before
   * the txn opens: resolve `leadId` (①), probe `LeadFavouriteCourses` for `(leadId, courseIntakeId)` (②),
   * then intake preflight (③) only when ② misses (re-add stops after ②). ② must follow ①; ① and ③ are
   * otherwise independent IO, so the hot path’s lower bound with **unconditional** preflight would be
   * two wall-clock phases: `Promise.all(①,③)` then ② (`max(①,③)` + ②) — at the price of running ③ on
   * every re-add. This flow keeps re-add to two cheap reads by gating ③ behind ②.
   */
  async addToWishlist(userId: string, courseIntakeId: string): Promise<void> {
    const leadId = await this.resolveLeadIdOrThrow(userId);
    const alreadyWishlistedRow = await this.db.leadFavouriteCourses.findOne({
      where: { leadId, courseIntakeId },
      select: { id: true },
    });
    if (!alreadyWishlistedRow) {
      await this.preflightIntakeBookableOrThrow(courseIntakeId);
    }
    const limit = this.appConfig.wishlist.perUserLimit;

    await this.db.transaction(async (em) => {
      await this.acquireLeadWishlistAddLock(em, leadId);
      await this.ensureIntakeBookableOrThrow(em, courseIntakeId);

      const repo = em.getRepository(LeadFavouriteCourses);

      const existing = await repo.findOne({
        where: { leadId, courseIntakeId },
        select: { id: true },
      });

      if (!existing) {
        const count = await repo.count({ where: { leadId } });
        if (count >= limit) {
          throw new WishlistLimitReachedException(limit);
        }
      }

      await repo.upsert(
        { leadId, courseIntakeId },
        {
          conflictPaths: ['leadId', 'courseIntakeId'],
          skipUpdateIfNoValuesChanged: true,
        },
      );
    });

    await this.invalidateWishlistCacheBestEffort(leadId);

    this.logger.LogInfo('wishlist.add', {
      context: 'WishlistService.addToWishlist',
      leadId,
      courseIntakeId,
    });
  }

  /**
   * Remove a course intake from the current user's wishlist.
   *
   * Wrapped in Postgres `transaction()` so future orchestration on this path stays
   * local. **`pg_advisory_xact_lock` is intentionally omitted** — no cap/count
   * invariant rides on DELETE; holding the add lock here would stall legitimate
   * concurrent adds without correctness gain (see module class JSDoc).
   *
   * Idempotent: deleting a row that isn't there still resolves successfully.
   *
   * Same Redis best-effort semantics as `addToWishlist` (see class JSDoc).
   */
  async removeFromWishlist(
    userId: string,
    courseIntakeId: string,
  ): Promise<void> {
    const leadId = await this.resolveLeadIdOrThrow(userId);

    await this.db.transaction(async (em) => {
      await em.getRepository(LeadFavouriteCourses).delete({
        leadId,
        courseIntakeId,
      });
    });

    await this.invalidateWishlistCacheBestEffort(leadId);

    this.logger.LogInfo('wishlist.remove', {
      context: 'WishlistService.removeFromWishlist',
      leadId,
      courseIntakeId,
    });
  }

  /**
   * Return the user's wishlist as `WishlistsResponseDto`.
   *
   * Hides favourites whose intake is inactive or soft-deleted via SQL
   * INNER JOIN filter. Ordered `createdAt DESC, id DESC`
   * (`IX_LeadFavouriteCourses_lead_createdAt`).
   */
  async getMyWishlist(userId: string): Promise<WishlistsResponseDto> {
    const leadId = await this.resolveLeadIdOrThrow(userId);

    const favourites = await this.queryActiveWishlistWithGraph(leadId);

    return {
      wishlists: favourites.map((fav) => this.mapper.toWishlistItem(fav)),
    };
  }

  /**
   * Intersect the requested intake ids with the user's wishlisted set.
   *
   * Backed by a per-user Redis Set (`wishlist:lead:{leadId}`, TTL 60s).
   * Returns an empty Set for unauthenticated users or users without a lead
   * profile so callers can treat the result as a uniform "no matches".
   */
  async getWishlistedIntakeIds(
    userId: string,
    intakeIds: string[],
  ): Promise<Set<string>> {
    if (intakeIds.length === 0) return new Set();

    const leadId = await this.resolveLeadIdOrNull(userId);
    if (!leadId) return new Set();

    const all = await this.loadAllWishlistedIdsForLead(leadId);
    if (all.size === 0) return new Set();

    return new Set(intakeIds.filter((id) => all.has(id)));
  }

  // =========================================================================
  // Internal helpers
  // =========================================================================

  /**
   * Serialize **add** mutations per lead (cap + upsert) inside the current Postgres
   * transaction (`pg_advisory_xact_lock`; released at COMMIT / ROLLBACK).
   *
   * **Not used on remove** — see `removeFromWishlist`.
   *
   * Single `pg_advisory_xact_lock(int, int)` using two well-spread 32-bit words
   * from `SysLeadProfiles.id` — avoids stacking multiple advisory calls and keeps
   * concurrent new adds serialized per lead.
   */
  private async acquireLeadWishlistAddLock(
    em: EntityManager,
    leadId: string,
  ): Promise<void> {
    const [k1, k2] = this.leadAdvisoryLockPairFromUuid(leadId);
    await em.query(
      `SELECT pg_advisory_xact_lock($1::integer, $2::integer)`,
      [k1, k2],
    );
  }

  /**
   * Two signed int32 words for `pg_advisory_xact_lock` from RFC-4122 bytes
   * [0..4) + [8..12), skipping bytes 4–7. For **v4** (random) PKs (`SysLeadProfiles.id`)
   * that skips version/variant nibbles — better mixing than adjacent words. Would be
   * a poor spread for **v1** (time-heavy) IDs; PKs here are assumed v4/random.
   */
  private leadAdvisoryLockPairFromUuid(leadId: string): [number, number] {
    const hex = leadId.replace(/-/g, '');
    if (hex.length !== 32 || !/^[0-9a-fA-F]+$/.test(hex)) {
      throw new Error(`wishlist advisory lock expects UUID lead id, got: ${leadId}`);
    }
    const buf = Buffer.from(hex, 'hex');
    return [buf.readInt32BE(0), buf.readInt32BE(8)];
  }

  /** One QB round-trip: active intake INNER JOIN plus the mapper’s relation graph. */
  private async queryActiveWishlistWithGraph(
    leadId: string,
  ): Promise<LeadFavouriteCourses[]> {
    return this.db.leadFavouriteCourses
      .createQueryBuilder('fav')
      .innerJoinAndSelect(
        'fav.UniCourseIntake',
        'intake',
        'intake.isActive = :intakeActive AND intake.deletedAt IS NULL',
        { intakeActive: true },
      )
      .leftJoinAndSelect('intake.UniCourse', 'course')
      .leftJoinAndSelect('course.SysUniversity', 'university')
      .leftJoinAndSelect('university.SysCountry', 'uniCountry')
      .leftJoinAndSelect('university.SysState', 'uniState')
      .leftJoinAndSelect('university.SysCity', 'uniCity')
      .leftJoinAndSelect('course.CourseEngReq', 'courseEngReq')
      .leftJoinAndSelect('courseEngReq.SysEnglishTest', 'engTest')
      .leftJoinAndSelect('intake.CourseIntakeScholarship', 'scholarship')
      .where('fav.leadId = :leadId', { leadId })
      .orderBy('fav.createdAt', 'DESC')
      .addOrderBy('fav.id', 'DESC')
      .getMany();
  }

  /** Fast-path read before the txn; authoritative check is `ensureIntakeBookableOrThrow`. */
  private async preflightIntakeBookableOrThrow(
    courseIntakeId: string,
  ): Promise<void> {
    const intake = await this.db.courseIntakes.findOne({
      where: { id: courseIntakeId },
      select: { id: true, isActive: true, deletedAt: true },
      withDeleted: true,
    });
    this.throwIfIntakeNotBookable(intake);
  }

  /** Resolve `leadId` from `userId` or throw 404. */
  private async resolveLeadIdOrThrow(userId: string): Promise<string> {
    const leadId = await this.resolveLeadIdOrNull(userId);
    if (!leadId) throw new LeadProfileNotFoundException();
    return leadId;
  }

  /** Resolve `leadId` from `userId` or return null (no exception). */
  private async resolveLeadIdOrNull(userId: string): Promise<string | null> {
    const lead = await this.db.leadProfiles.findOne({
      where: { userId },
      select: { id: true },
    });
    return lead?.id ?? null;
  }

  /** Authoritative intake gate under advisory lock / same transactional snapshot as upsert. */
  private async ensureIntakeBookableOrThrow(
    em: EntityManager,
    courseIntakeId: string,
  ): Promise<void> {
    const intake = await em.getRepository(UniCourseIntakes).findOne({
      where: { id: courseIntakeId },
      select: { id: true, isActive: true, deletedAt: true },
      withDeleted: true,
    });

    this.throwIfIntakeNotBookable(intake);
  }

  private throwIfIntakeNotBookable(
    intake: { isActive: boolean; deletedAt?: Date | null } | null | undefined,
  ): void {
    if (!intake || !intake.isActive || intake.deletedAt != null) {
      throw new InactiveCourseIntakeException();
    }
  }

  /**
   * Load the full set of wishlisted intake ids for the given lead.
   *
   * Cached as `{ ids: string[] }` under `wishlist:lead:{leadId}`. The cache
   * service is fail-open, so on Redis outage we silently fall back to a
   * single DB query.
   */
  private async loadAllWishlistedIdsForLead(
    leadId: string,
  ): Promise<Set<string>> {
    const key = this.cacheKey(leadId);
    const cached = await this.cache.getOrSet<CachedWishlistIds>(
      key,
      async () => {
        const rows = await this.db.leadFavouriteCourses.find({
          where: { leadId },
          select: { courseIntakeId: true },
        });
        return { ids: rows.map((r) => r.courseIntakeId) };
      },
      CACHE_TTL_SECONDS,
    );
    return new Set(cached.ids);
  }

  /**
   * Fire-and-forget cache drop after successful DB mutation.
   *
   * Never throws — Redis outages or post-commit crashes must not confuse the caller;
   * `CACHE_TTL_SECONDS` backs up correctness on missed invalidations.
   */
  private async invalidateWishlistCacheBestEffort(leadId: string): Promise<void> {
    try {
      await this.cache.remove(this.cacheKey(leadId));
    } catch (err) {
      this.logger.LogWarning('wishlist.cacheInvalidateFailed', {
        context: 'WishlistService.invalidateWishlistCacheBestEffort',
        leadId,
        err,
      });
    }
  }

  private cacheKey(leadId: string): string {
    return `${CACHE_KEY_PREFIX}${leadId}`;
  }
}
