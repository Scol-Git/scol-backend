import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { LeadAcademicResults } from '@entity/entities/LeadAcademicResults.entity';
import { LeadEnglishTestResults } from '@entity/entities/LeadEnglishTestResults.entity';
import { LeadEnglishTestSectionResults } from '@entity/entities/LeadEnglishTestSectionResults.entity';
import { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { AcademicFormRequestDto } from '@shared/dtos/leads/AcademicFormRequestDto';

export type AcademicResultWriteInput = {
  degreeId: string;
  gpa?: number;
  institute?: string;
  passingDate?: string;
};

@Injectable()
export class LeadAcademicResultWriter {
  async upsertAcademicResults(
    repo: Repository<LeadAcademicResults>,
    leadId: string,
    results: AcademicResultWriteInput[],
  ): Promise<void> {
    if (!results || results.length === 0) return;

    const existingResults = await repo.find({ where: { leadId } });
    const existingByDegreeId = new Map(
      existingResults.map((r) => [r.degreeId, r]),
    );

    for (const result of results) {
      const existing = existingByDegreeId.get(result.degreeId);
      const gpaStr = result.gpa != null ? String(result.gpa) : undefined;
      const passingDateVal = result.passingDate
        ? new Date(result.passingDate)
        : undefined;

      if (existing) {
        const update: {
          gpa?: string;
          institute?: string;
          passingDate?: Date;
          isVerified?: boolean;
        } = {};
        if (gpaStr !== undefined) {
          update.gpa = gpaStr;
        }
        if (passingDateVal !== undefined) {
          update.passingDate = passingDateVal;
        }
        if (result.institute !== undefined) {
          update.institute = result.institute;
        }
        if (Object.keys(update).length > 0) {
          update.isVerified = false;
          await repo.update(existing.id, update);
        }
      } else {
        const entity = repo.create({
          leadId,
          degreeId: result.degreeId,
          gpa: gpaStr,
          passingDate: passingDateVal,
          institute: '',
          isVerified: false,
        });
        if (result.institute !== undefined) {
          entity.institute = result.institute;
        }
        await repo.save(entity);
      }
    }
  }

  async upsertEnglishTestResults(
    testRepo: Repository<LeadEnglishTestResults>,
    sectionRepo: Repository<LeadEnglishTestSectionResults>,
    leadId: string,
    results: AcademicFormRequestDto['englishTestResults'],
  ): Promise<void> {
    if (!results || results.length === 0) return;

    const existingResults = await testRepo.find({ where: { leadId } });
    const existingByTestId = new Map(
      existingResults.map((r) => [r.sysEngTestId, r]),
    );

    for (const result of results) {
      const overall =
        result.overallScore != null && result.overallScore > 0
          ? String(result.overallScore)
          : undefined;
      if (overall == null) continue;

      const existing = existingByTestId.get(result.testId);
      const testDateVal = result.testDate
        ? new Date(result.testDate)
        : undefined;

      if (existing) {
        await testRepo.update(existing.id, {
          overallScore: overall,
          testDate: testDateVal,
          isVerified: false,
        });
        await this.upsertEnglishTestSections(
          sectionRepo,
          existing.id,
          result.sections ?? [],
        );
      } else {
        const savedTest = await testRepo.save(
          testRepo.create({
            leadId,
            sysEngTestId: result.testId,
            overallScore: overall,
            testDate: testDateVal,
            isVerified: false,
          }),
        );
        const sections = result.sections ?? [];
        if (sections.length > 0) {
          await sectionRepo.save(
            sections.map((s) =>
              sectionRepo.create({
                resultId: savedTest.id,
                sysEngTestSectionId: s.id,
                sectionScore: String(s.score),
              }),
            ),
          );
        }
      }
    }
  }

  async upsertEnglishTestSections(
    repo: Repository<LeadEnglishTestSectionResults>,
    resultId: string,
    sections: { id: string; score: number }[],
  ): Promise<void> {
    if (!sections || sections.length === 0) {
      return;
    }

    const existingSections = await repo.find({ where: { resultId } });
    const existingBySectionId = new Map(
      existingSections.map((s) => [s.sysEngTestSectionId, s]),
    );

    for (const section of sections) {
      const existing = existingBySectionId.get(section.id);
      if (existing) {
        await repo.update(existing.id, {
          sectionScore: section.score.toString(),
        });
      } else {
        await repo.save(
          repo.create({
            resultId,
            sysEngTestSectionId: section.id,
            sectionScore: section.score.toString(),
          }),
        );
      }
    }
  }

  async saveValidatedEnglishTestResults(
    manager: EntityManager,
    leadId: string,
    englishTestResults: NonNullable<
      AcademicFormRequestDto['englishTestResults']
    >,
  ): Promise<void> {
    const testIds = englishTestResults.map((r) => r.testId);
    const tests = await manager.getRepository(SysEnglishTests).find({
      where: testIds.map((id) => ({ id })),
      relations: { SysEnglishTestSection: true },
    });
    const testMap = new Map(tests.map((t) => [t.id, t]));

    const validEnglish = englishTestResults.filter((result) => {
      const test = testMap.get(result.testId);

      if (!test?.maxScore) return false;

      const testMaxScore = parseFloat(test.maxScore);
      if (isNaN(testMaxScore)) return false;
      const overallValid =
        result.overallScore != null &&
        result.overallScore > 0 &&
        result.overallScore <= testMaxScore;
      const sections = test.SysEnglishTestSection ?? [];
      if (sections.length === 0) return overallValid;

      const sectionScores = result.sections ?? [];
      return (
        overallValid &&
        sections.every((section) => {
          if (!section.maxScore) return false;
          const max = parseFloat(section.maxScore);
          if (isNaN(max)) return false;
          const provided = sectionScores.find((s) => s.id === section.id);
          return (
            provided != null && provided.score > 0 && provided.score <= max
          );
        })
      );
    });
    if (validEnglish.length === 0) return;

    await this.upsertEnglishTestResults(
      manager.getRepository(LeadEnglishTestResults),
      manager.getRepository(LeadEnglishTestSectionResults),
      leadId,
      validEnglish,
    );
  }

  async deleteAcademicResult(
    manager: EntityManager,
    leadId: string,
    degreeId: string,
  ): Promise<boolean> {
    const repo = manager.getRepository(LeadAcademicResults);
    const existing = await repo.findOne({ where: { leadId, degreeId } });
    if (!existing) {
      return false;
    }

    await repo.delete(existing.id);
    return true;
  }

  async deleteEnglishTestResult(
    manager: EntityManager,
    leadId: string,
    testId: string,
  ): Promise<boolean> {
    const testRepo = manager.getRepository(LeadEnglishTestResults);
    const existing = await testRepo.findOne({
      where: { leadId, sysEngTestId: testId },
    });
    if (!existing) {
      return false;
    }

    await manager
      .getRepository(LeadEnglishTestSectionResults)
      .delete({ resultId: existing.id });
    await testRepo.delete(existing.id);
    return true;
  }
}
