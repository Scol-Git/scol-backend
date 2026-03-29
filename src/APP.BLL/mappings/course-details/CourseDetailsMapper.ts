import { Injectable } from '@nestjs/common';
import type { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import type { CourseIntakeScholarships } from '@entity/entities/CourseIntakeScholarships.entity';
import { CourseDetailsResponseDto } from '@shared/dtos/course-details/CourseDetailsResponseDto';
import { CourseDetailsDto } from '@shared/dtos/course-details/CourseDetailsDto';
import { MetaItemDto } from '@shared/dtos/course-details/MetaItemDto';

@Injectable()
export class CourseDetailsMapper {
  toCourseDetailsResponse(intake: UniCourseIntakes): CourseDetailsResponseDto {
    return {
      courseDetails: this.toCourseDetailsDto(intake),
      meta: this.buildMeta(intake),
    };
  }

  private toCourseDetailsDto(intake: UniCourseIntakes): CourseDetailsDto {
    const course = intake.UniCourse;
    const uni = course?.SysUniversity;
    const scholarships = intake.CourseIntakeScholarship ?? [];

    return {
      courseId: intake.id,
      courseName: course?.courseName ?? '',
      ranking: {
        position: uni?.currRanking ?? null,
        hasInfo: !!uni?.rankingMetaData,
        infoKey: 'rankingMetaData',
      },
      university: {
        uniId: uni?.id ?? '',
        uniName: uni?.uniName ?? '',
        uniLogoUrl: uni?.logoUrl ?? null,
        uniCoverImageUrl: uni?.coverImageUrl ?? null,
      },
      tags: this.buildTags(uni),
      tabs: [
        'aboutUs',
        'campusLife',
        'location',
        'academicRequirements',
        'feesAndScholarships',
        'intakeDates',
      ],
      aboutUs: this.buildAboutUs(uni),
      campusLife: this.buildCampusLife(uni),
      location: this.buildLocation(uni),
      academicRequirements: this.buildAcademicRequirements(intake),
      feesAndScholarships: this.buildFeesAndScholarships(intake, scholarships),
      intakeDates: this.buildIntakeDates(intake),
    };
  }

  private buildMeta(intake: UniCourseIntakes): MetaItemDto[] {
    const course = intake.UniCourse;
    const uni = course?.SysUniversity;
    const scholarships = intake.CourseIntakeScholarship ?? [];
    const meta: MetaItemDto[] = [];

    if (uni?.rankingMetaData) {
      meta.push({
        infoKey: 'rankingMetaData',
        title: 'Ranking',
        information: this.normalizeMetaToInformation(uni.rankingMetaData),
      });
    }

    const academic = this.buildAcademicRequirements(intake);
    if (academic.hasInfo) {
      const payload = this.buildAcademicRequirementsMetaPayload(intake);
      if (payload && Object.keys(payload).length > 0) {
        meta.push({
          infoKey: 'academicRequirementsMetaData',
          title: 'Academic requirements',
          information: this.normalizeMetaToInformation(payload),
        });
      }
    }

    const intakeTab = this.buildIntakeDates(intake);
    if (intakeTab.hasInfo) {
      const payload = this.buildIntakeDatesMetaPayload(intake);
      if (payload && Object.keys(payload).length > 0) {
        meta.push({
          infoKey: 'intakeDatesMetaData',
          title: 'Intake dates',
          information: this.normalizeMetaToInformation(payload),
        });
      }
    }

    const feesTab = this.buildFeesAndScholarships(intake, scholarships);
    if (feesTab.hasInfo) {
      const payload = this.buildFeesAndScholarshipsMetaPayload(
        intake,
        scholarships,
      );
      if (payload && Object.keys(payload).length > 0) {
        meta.push({
          infoKey: 'feesAndScholarshipsMetaData',
          title: 'Fees and scholarships',
          information: this.normalizeMetaToInformation(payload),
        });
      }
    }

    return meta;
  }

  /** JSONB / structured fields merged for meta[].information (same keys clients resolve via infoKey). */
  private buildAcademicRequirementsMetaPayload(
    intake: UniCourseIntakes,
  ): Record<string, unknown> | null {
    const course = intake.UniCourse;
    if (!course) return null;
    if (course.requirementMetaData) {
      return { ...course.requirementMetaData };
    }
    return this.buildAcademicRequirementsFallbackPayload(intake);
  }

  private buildAcademicRequirementsFallbackPayload(
    intake: UniCourseIntakes,
  ): Record<string, unknown> | null {
    const course = intake.UniCourse;
    if (!course) return null;
    const out: Record<string, unknown> = {};
    if (course.minGpa != null) out.minGpa = course.minGpa;
    if (course.higherGpa != null) out.higherGpa = course.higherGpa;
    if (course.minSysAcademicDegree?.degreeName) {
      out.minDegree = course.minSysAcademicDegree.degreeName;
    }
    if (course.higherSysAcademicDegree?.degreeName) {
      out.higherDegree = course.higherSysAcademicDegree.degreeName;
    }
    if (course.CourseEngReq?.length) {
      out.englishRequirements = course.CourseEngReq.map((r) => ({
        testName: r.SysEnglishTest?.testName,
        minOverallReq: r.minOverallReq,
        minSectionReq: r.minSectionReq,
      }));
    }
    if (!Object.keys(out).length && course.UniCourseIntake?.length) {
      out.intakeOptionsCount = course.UniCourseIntake.length;
    }
    return Object.keys(out).length ? out : null;
  }

  private buildIntakeDatesMetaPayload(
    intake: UniCourseIntakes,
  ): Record<string, unknown> | null {
    const course = intake.UniCourse;
    const out: Record<string, unknown> = {};
    if (intake.intakeMetaData) {
      out.intakeMetaData = intake.intakeMetaData;
    }
    const rows = course?.UniCourseIntake ?? [];
    if (rows.length) {
      out.intakes = rows.map((i) => ({
        id: i.id,
        intakeMonth: i.intakeMonth,
        intakeYear: i.intakeYear,
        applicationDeadline: i.applicationDeadline,
        courseDuration: i.courseDuration,
      }));
    }
    return Object.keys(out).length ? out : null;
  }

  private buildFeesAndScholarshipsMetaPayload(
    intake: UniCourseIntakes,
    scholarships: CourseIntakeScholarships[],
  ): Record<string, unknown> | null {
    const out: Record<string, unknown> = {};
    if (intake.feesMetaData) {
      out.feesMetaData = intake.feesMetaData;
    }
    if (scholarships.length) {
      out.scholarships = scholarships.map((s) => ({
        name: s.name,
        amount: s.amount,
        amountType: s.amountType,
        frequency: s.frequency,
        scholarshipMetaData: s.scholarshipMetaData ?? null,
      }));
    }
    return Object.keys(out).length ? out : null;
  }

  private normalizeMetaToInformation(
    data: Record<string, unknown>,
  ): { subtitle?: string; description: string[] }[] {
    return [{ description: [JSON.stringify(data)] }];
  }

  private buildTags(uni:
    | {
        establishedYear?: number;
        universityType?: string;
        SysCity?: { cityName?: string };
        SysCountry?: { countryName?: string };
      }
    | undefined): string[] {
    const tags: string[] = [];
    if (uni?.establishedYear) tags.push(`Est. ${uni.establishedYear}`);
    if (uni?.universityType) tags.push(uni.universityType);
    if (uni?.SysCity?.cityName) tags.push(uni.SysCity.cityName);
    if (uni?.SysCountry?.countryName) tags.push(uni.SysCountry.countryName);
    return tags;
  }

  private buildAboutUs(uni: { aboutUs?: string } | undefined):
    | { description: string[] }
    | undefined {
    if (!uni?.aboutUs) return undefined;
    return { description: uni.aboutUs.split(/\n\n+/).filter(Boolean) };
  }

  private buildCampusLife(uni: { campusLifeLinks?: string[] } | undefined):
    | { media: { videoUrl?: string[] } }
    | undefined {
    if (!uni?.campusLifeLinks?.length) return undefined;
    return { media: { videoUrl: uni.campusLifeLinks } };
  }

  private buildLocation(uni:
    | {
        address?: string;
        SysCity?: { cityName?: string };
        SysCountry?: { countryName?: string };
        SysState?: { stateName?: string };
        locationMapMetaData?: Record<string, unknown>;
      }
    | undefined) {
    return {
      city: uni?.SysCity?.cityName ?? null,
      country: uni?.SysCountry?.countryName ?? null,
      state: uni?.SysState?.stateName ?? null,
      address: uni?.address ?? null,
      coordinates: uni?.locationMapMetaData ?? null,
    };
  }

  private buildAcademicRequirements(intake: UniCourseIntakes): {
    hasInfo: boolean;
    infoKey: string;
  } {
    const course = intake.UniCourse;
    const hasInfo = !!(
      course?.requirementMetaData ||
      (course?.UniCourseIntake && course.UniCourseIntake.length > 0)
    );
    return { hasInfo, infoKey: 'academicRequirementsMetaData' };
  }

  private buildFeesAndScholarships(
    intake: UniCourseIntakes,
    scholarships: CourseIntakeScholarships[],
  ): { hasInfo: boolean; infoKey: string } {
    const hasInfo = !!(intake.feesMetaData || scholarships.length > 0);
    return { hasInfo, infoKey: 'feesAndScholarshipsMetaData' };
  }

  private buildIntakeDates(intake: UniCourseIntakes): {
    hasInfo: boolean;
    infoKey: string;
  } {
    const course = intake.UniCourse;
    const intakes = course?.UniCourseIntake ?? [];
    const hasInfo = !!(intake.intakeMetaData || intakes.length > 0);
    return { hasInfo, infoKey: 'intakeDatesMetaData' };
  }
}
