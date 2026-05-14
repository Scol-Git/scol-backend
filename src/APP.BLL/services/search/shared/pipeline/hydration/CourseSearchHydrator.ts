import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { CourseIntakeScholarships } from '@entity/entities/CourseIntakeScholarships.entity';
import { CourseEngReq } from '@entity/entities/CourseEngReq.entity';

@Injectable()
export class CourseSearchHydrator {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async hydrateSummaryPage(orderedIds: string[]): Promise<UniCourseIntakes[]> {
    return this.hydrateByIdsPreservingOrder(orderedIds);
  }

  private async hydrateByIds(
    candidateIds: string[],
  ): Promise<UniCourseIntakes[]> {
    if (candidateIds.length === 0) return [];

    const baseIntakes = await this.dataSource
      .createQueryBuilder(UniCourseIntakes, 'ci')
      .innerJoinAndSelect('ci.UniCourse', 'course')
      .innerJoinAndSelect('course.SysUniversity', 'uni')
      .innerJoinAndSelect('uni.SysCountry', 'country')
      .leftJoinAndSelect('uni.SysState', 'state')
      .leftJoinAndSelect('uni.SysCity', 'city')
      .leftJoinAndSelect('course.minSysAcademicDegree', 'minDegree')
      .leftJoinAndSelect('course.higherSysAcademicDegree', 'higherDegree')
      .where('ci.id IN (:...candidateIds)', { candidateIds })
      .getMany();

    if (baseIntakes.length === 0) return [];

    const courseIds = [
      ...new Set(baseIntakes.map((ci) => ci.UniCourse?.id).filter(Boolean)),
    ] as string[];

    const engReqsMap = await this.loadEngRequirements(courseIds);

    for (const intake of baseIntakes) {
      if (intake.UniCourse) {
        intake.UniCourse.CourseEngReq =
          engReqsMap.get(intake.UniCourse.id) || [];
      }
    }

    return baseIntakes;
  }

  private async loadEngRequirements(
    courseIds: string[],
  ): Promise<Map<string, CourseEngReq[]>> {
    if (courseIds.length === 0) return new Map();

    const engReqs = (await this.dataSource
      .createQueryBuilder()
      .select('engReq')
      .from('CourseEngReq', 'engReq')
      .leftJoinAndSelect('engReq.SysEnglishTest', 'engTest')
      .where('engReq.uniCourseId IN (:...courseIds)', { courseIds })
      .getMany()) as CourseEngReq[];

    const map = new Map<string, CourseEngReq[]>();
    for (const engReq of engReqs) {
      const key = engReq.uniCourseId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(engReq);
    }

    return map;
  }

  private async hydrateByIdsPreservingOrder(
    orderedIds: string[],
  ): Promise<UniCourseIntakes[]> {
    const hydrated = await this.hydrateByIds(orderedIds);
    const byId = new Map(hydrated.map((c) => [c.id, c]));

    return orderedIds
      .map((id) => byId.get(id))
      .filter((c): c is UniCourseIntakes => c !== undefined);
  }
}
