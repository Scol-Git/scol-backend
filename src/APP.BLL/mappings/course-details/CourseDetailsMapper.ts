import { Injectable } from '@nestjs/common';
import type { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
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
      intakeDates: this.buildIntakeDates(course),
    };
  }

  private buildMeta(intake: UniCourseIntakes): MetaItemDto[] {
    const course = intake.UniCourse;
    const uni = course?.SysUniversity;
    const meta: MetaItemDto[] = [];

    if (uni?.rankingMetaData) {
      meta.push({
        infoKey: 'rankingMetaData',
        title: 'Ranking',
        information: this.normalizeMetaToInformation(uni.rankingMetaData),
      });
    }
    return meta;
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
    scholarships: unknown[],
  ): { hasInfo: boolean; infoKey: string } {
    const hasInfo = !!(intake.feesMetaData || scholarships.length > 0);
    return { hasInfo, infoKey: 'feesAndScholarshipsMetaData' };
  }

  private buildIntakeDates(
    course:
      | {
          UniCourseIntake?: Array<{ intakeMonth: number; intakeYear: number }>;
        }
      | undefined,
  ): { hasInfo: boolean; infoKey: string } {
    const intakes = course?.UniCourseIntake ?? [];
    const hasInfo = intakes.length > 0;
    return { hasInfo, infoKey: 'intakeDatesMetaData' };
  }
}
