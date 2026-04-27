import { Injectable, NotFoundException } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { LeadAcademicResults } from '@entity/entities/LeadAcademicResults.entity';
import { LeadEnglishTestResults } from '@entity/entities/LeadEnglishTestResults.entity';
import type {
  AcademicResult,
  DegreeId,
  EnglishTestId,
  EnglishTestResult,
  NormalizedEligibilityProfile,
} from '@shared/eligibility/EligibilityTypes';

/**
 * Fold state while merging multiple DB rows for the same English test id.
 * Policy: keep the highest finite overall score seen; per section id, keep the highest section score.
 */
interface AggregatedEnglishResult {
  maxOverall?: number;
  sectionBestBySectionId: Map<string, number>;
}

@Injectable()
export class EligibilityProfileBuilder {
  constructor(private readonly db: AppDbContext) {}

  async buildForUserOrThrow(
    userId: string,
  ): Promise<NormalizedEligibilityProfile> {
    const leadId = await this.loadLeadIdByUserIdOrThrow(userId);
    return this.buildNormalizedProfileForLeadIdOrThrow(leadId);
  }

  async buildForLeadOrThrow(
    leadId: string,
  ): Promise<NormalizedEligibilityProfile> {
    return this.buildNormalizedProfileForLeadIdOrThrow(leadId);
  }

  private async buildNormalizedProfileForLeadIdOrThrow(
    leadId: string,
  ): Promise<NormalizedEligibilityProfile> {
    const [academicRows, englishRows] = await Promise.all([
      this.loadAcademicRows(leadId),
      this.loadEnglishRows(leadId),
    ]);

    return {
      leadId,
      academicResultsByDegreeId:
        this.normalizeAcademicResultsByDegreeId(academicRows),
      englishResultsByTestId: this.normalizeEnglishResultsByTestId(englishRows),
    };
  }

  private async loadLeadIdByUserIdOrThrow(userId: string): Promise<string> {
    const lead = await this.db.leadProfiles.findOne({
      where: { userId },
    });

    if (!lead) {
      throw new NotFoundException('Lead profile not found');
    }

    return lead.id;
  }

  private loadAcademicRows(leadId: string): Promise<LeadAcademicResults[]> {
    return this.db.leadAcademicResults.find({ where: { leadId } });
  }

  private loadEnglishRows(leadId: string): Promise<LeadEnglishTestResults[]> {
    return this.db.leadEnglishTestResults.find({
      where: { leadId },
      relations: { LeadEnglishTestSectionResult: true },
    });
  }

  /**
   * Groups academic rows by degree id.
   * Merge policy: for duplicate degree ids, retain the best (maximum) finite GPA;
   * a row without GPA does not erase a numeric GPA already merged for that degree.
   */
  private normalizeAcademicResultsByDegreeId(
    rows: LeadAcademicResults[],
  ): Map<DegreeId, AcademicResult> {
    const byDegreeId = new Map<DegreeId, AcademicResult>();

    for (const row of rows) {
      const nextGpa = this.parseOptionalDecimal(row.gpa);
      const merged = this.applyBestGpaMergePolicy(
        byDegreeId.get(row.degreeId),
        nextGpa,
      );
      byDegreeId.set(row.degreeId, merged);
    }

    return byDegreeId;
  }

  private applyBestGpaMergePolicy(
    existing: AcademicResult | undefined,
    nextGpa: number | undefined,
  ): AcademicResult {
    if (existing?.gpa === undefined) {
      return nextGpa === undefined ? {} : { gpa: nextGpa };
    }
    if (nextGpa === undefined) {
      return { gpa: existing.gpa };
    }
    return { gpa: Math.max(existing.gpa, nextGpa) };
  }

  private normalizeEnglishResultsByTestId(
    rows: LeadEnglishTestResults[],
  ): Map<EnglishTestId, EnglishTestResult> {
    const aggregatesByTestId = new Map<string, AggregatedEnglishResult>();

    for (const row of rows) {
      const aggregate = this.getOrCreateEnglishAggregate(
        aggregatesByTestId,
        row.sysEngTestId,
      );
      this.mergeOverallScore(aggregate, row);
      this.mergeSectionScores(aggregate, row);
    }

    const result = new Map<EnglishTestId, EnglishTestResult>();
    for (const [testId, aggregate] of aggregatesByTestId) {
      result.set(testId, this.mapEnglishAggregateToResult(aggregate));
    }

    return result;
  }

  private getOrCreateEnglishAggregate(
    aggregatesByTestId: Map<string, AggregatedEnglishResult>,
    sysEngTestId: string,
  ): AggregatedEnglishResult {
    let aggregate = aggregatesByTestId.get(sysEngTestId);
    if (!aggregate) {
      aggregate = { sectionBestBySectionId: new Map() };
      aggregatesByTestId.set(sysEngTestId, aggregate);
    }
    return aggregate;
  }

  private mergeOverallScore(
    aggregate: AggregatedEnglishResult,
    row: LeadEnglishTestResults,
  ): void {
    const overall = this.parseOptionalDecimal(row.overallScore);
    if (overall === undefined) {
      return;
    }

    aggregate.maxOverall =
      aggregate.maxOverall === undefined
        ? overall
        : Math.max(aggregate.maxOverall, overall);
  }

  private mergeSectionScores(
    aggregate: AggregatedEnglishResult,
    row: LeadEnglishTestResults,
  ): void {
    for (const sectionRow of row.LeadEnglishTestSectionResult ?? []) {
      const sectionId = sectionRow.sysEngTestSectionId;
      const score = this.parseOptionalDecimal(sectionRow.sectionScore);
      if (score === undefined) {
        continue;
      }

      const previousBest = aggregate.sectionBestBySectionId.get(sectionId);
      if (previousBest === undefined || score > previousBest) {
        aggregate.sectionBestBySectionId.set(sectionId, score);
      }
    }
  }

  /**
   * Maps fold state to the shared contract. When no finite overall was merged,
   * overallScore is 0 (same as prior builder) so CourseEligibilityService comparisons stay stable.
   */
  private mapEnglishAggregateToResult(
    aggregate: AggregatedEnglishResult,
  ): EnglishTestResult {
    return {
      overallScore:
        aggregate.maxOverall === undefined ? 0 : aggregate.maxOverall,
      sectionScores: [...aggregate.sectionBestBySectionId.entries()].map(
        ([sectionId, score]) => ({ sectionId, score }),
      ),
    };
  }

  private parseOptionalDecimal(value?: string | null): number | undefined {
    if (value == null || value === '') {
      return undefined;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
}
