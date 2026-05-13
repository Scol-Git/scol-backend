import { Injectable } from '@nestjs/common';
import type { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import type { SysUniversities } from '@entity/entities/SysUniversities.entity';
import { CourseDetailsResponseDto } from '@shared/dtos/course-details/CourseDetailsResponseDto';
import {
  CourseDetailsDto,
  RankingDto,
  UniversityDetailsDto,
  LocationDto,
  LocationCoordinatesDto,
  CourseTagDto,
  CourseTabDto,
  AcademicRequirementsContentDto,
  AcademicRequirementsSectionDto,
  FeesAndScholarshipsSectionDto,
  IntakeDatesSectionDto,
  CampusLifeMediaDto,
} from '@shared/dtos/course-details/CourseDetailsDto';
import { MetaItemDto } from '@shared/dtos/course-details/MetaItemDto';
import type { CourseDetailsLeadFlags } from '@bll/services/CourseService/CourseDetailsLeadFlagsResolver';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

type MonthName = (typeof MONTH_NAMES)[number];

const COURSE_DETAIL_TABS: CourseTabDto[] = [
  { key: 'aboutUs', label: 'About Us' },
  { key: 'campusLife', label: 'Campus Life' },
  { key: 'location', label: 'Location' },
  { key: 'academicRequirements', label: 'Academic Info' },
  { key: 'feesAndScholarships', label: 'Fees & Scholarships' },
  { key: 'intakeDates', label: 'Intake Dates' },
];

// ─── Section meta config ──────────────────────────────────────────────────────

interface SectionMeta {
  infoKey: string;
  title: string;
}

const SECTION_META = {
  ranking: { infoKey: 'rankingMetaData', title: 'Ranking' } as const,
  academic: {
    infoKey: 'academicRequirementsMetaData',
    title: 'Academic Requirements',
  } as const,
  fees: {
    infoKey: 'feesAndScholarshipsMetaData',
    title: 'Fees & Scholarships',
  } as const,
  intakes: { infoKey: 'intakeDatesMetaData', title: 'Intake Dates' } as const,
} satisfies Record<string, SectionMeta>;

// ─── Local source types ───────────────────────────────────────────────────────

type BaseUni = Pick<SysUniversities, 'establishedYear' | 'universityType'>;

type UniTagSource = BaseUni & {
  SysCity?: { cityName?: string };
  SysCountry?: { countryName?: string };
};

type UniLocationSource = {
  address?: string;
  SysCity?: { cityName?: string };
  SysCountry?: { countryName?: string };
  SysState?: { stateName?: string };
  locationMapMetaData?: string;
};

type UniAboutSource = { aboutUs?: string };
type UniCampusSource = { campusLifeLinks?: string[] };

// ─── Section interface ────────────────────────────────────────────────────────

interface CourseDetailSections {
  ranking: RankingDto;
  academic: AcademicRequirementsSectionDto;
  fees: FeesAndScholarshipsSectionDto;
  intakeDates: IntakeDatesSectionDto;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

@Injectable()
export class CourseDetailsMapper {
  toCourseDetailsResponse(
    intake: UniCourseIntakes,
    currentYearIntakes: UniCourseIntakes[],
    leadFlags: CourseDetailsLeadFlags,
  ): CourseDetailsResponseDto {
    const sections = this.buildSections(intake, currentYearIntakes);
    return {
      courseDetails: this.buildCourseDetails(intake, sections, leadFlags),
      meta: this.buildMeta(intake, sections),
    };
  }

  // ─── Top-level builders ───────────────────────────────────────────────────

  private buildSections(
    intake: UniCourseIntakes,
    currentYearIntakes: UniCourseIntakes[],
  ): CourseDetailSections {
    const uni = intake.UniCourse?.SysUniversity;
    return {
      ranking: this.buildRanking(uni),
      academic: this.buildAcademicSection(intake),
      fees: this.buildFeesSection(intake),
      intakeDates: this.buildIntakeDatesSection(currentYearIntakes),
    };
  }

  private buildCourseDetails(
    intake: UniCourseIntakes,
    sections: CourseDetailSections,
    leadFlags: CourseDetailsLeadFlags,
  ): CourseDetailsDto {
    const uni = intake.UniCourse?.SysUniversity;

    return {
      courseId: intake.uniCourseId,
      courseName: intake.UniCourse?.courseName ?? '',
      isEligible: leadFlags.isEligible,
      alreadyApplied: leadFlags.alreadyApplied,
      ranking: sections.ranking,
      university: this.buildUniversity(uni),
      tags: this.buildTags(uni),
      tabs: COURSE_DETAIL_TABS.map((t) => ({ ...t })),
      aboutUs: this.buildAboutUs(uni),
      campusLife: this.buildCampusLife(uni),
      location: this.buildLocation(uni),
      academicRequirements: sections.academic,
      feesAndScholarships: sections.fees,
      intakeDates: sections.intakeDates,
    };
  }

  // ─── Meta ─────────────────────────────────────────────────────────────────

  private buildMeta(
    intake: UniCourseIntakes,
    sections: CourseDetailSections,
  ): MetaItemDto[] {
    const uni = intake.UniCourse?.SysUniversity;
    const meta: MetaItemDto[] = [];

    if (uni?.rankingMetaData)
      meta.push({ ...SECTION_META.ranking, information: uni.rankingMetaData });

    if (intake.UniCourse?.requirementMetaData)
      meta.push({
        ...SECTION_META.academic,
        information: intake.UniCourse.requirementMetaData,
      });

    const feesInformation = [
      ...(intake.feesMetaData ?? []),
      ...(intake.scholarshipMetaData ?? []),
    ];
    if (feesInformation.length > 0)
      meta.push({ ...SECTION_META.fees, information: feesInformation });

    if (intake.intakeMetaData)
      meta.push({
        ...SECTION_META.intakes,
        information: intake.intakeMetaData,
      });

    return meta;
  }

  // ─── Section builders ─────────────────────────────────────────────────────

  private buildRanking(uni: SysUniversities | undefined): RankingDto {
    return {
      position: uni?.currRanking ?? null,
      hasInfo: uni?.rankingMetaData != null,
      infoKey: SECTION_META.ranking.infoKey,
    };
  }

  private buildAcademicSection(
    intake: UniCourseIntakes,
  ): AcademicRequirementsSectionDto {
    return {
      hasInfo: intake.UniCourse?.requirementMetaData != null,
      infoKey: SECTION_META.academic.infoKey,
      requirements: this.buildAcademicContent(intake),
    };
  }

  private buildAcademicContent(
    intake: UniCourseIntakes,
  ): AcademicRequirementsContentDto {
    const course = intake.UniCourse;
    if (!course) return { degreeRequirements: [], englishRequirements: [] };

    const degreeRequirements: AcademicRequirementsContentDto['degreeRequirements'] =
      [];

    if (course.minSysAcademicDegree?.degreeName && course.minGpa != null) {
      degreeRequirements.push({
        degreeName: course.minSysAcademicDegree.degreeName,
        label:
          (course.minSysAcademicDegree.levelOrder ?? 0) > 1 ? 'CGPA' : 'GPA',
        minValue: course.minGpa,
      });
    }

    if (
      course.higherSysAcademicDegree?.degreeName &&
      course.higherGpa != null
    ) {
      degreeRequirements.push({
        degreeName: course.higherSysAcademicDegree.degreeName,
        label:
          (course.higherSysAcademicDegree.levelOrder ?? 0) > 1 ? 'CGPA' : 'GPA',
        minValue: course.higherGpa,
      });
    }

    const englishRequirements = (course.CourseEngReq ?? []).map((r) => ({
      testName: r.SysEnglishTest?.testName ?? 'English test',
      minOverallValue: r.minOverallReq ?? '',
      minSectionValue: r.minSectionReq ?? '',
    }));

    return { degreeRequirements, englishRequirements };
  }

  private buildFeesSection(
    intake: UniCourseIntakes,
  ): FeesAndScholarshipsSectionDto {
    const hasScholarship = intake.scholarshipMetaData != null;
    const hasInfo = intake.feesMetaData != null || hasScholarship;

    return {
      hasInfo,
      infoKey: SECTION_META.fees.infoKey,
      items: this.buildFeesItems(intake, hasScholarship),
    };
  }

  private buildFeesItems(
    intake: UniCourseIntakes,
    hasScholarship: boolean,
  ): FeesAndScholarshipsSectionDto['items'] {
    return {
      tuitionFees: intake.tuitionFee
        ? {
            amount: intake.tuitionFee,
            currency: intake.currency ?? null,
            frequency: 'yearly',
          }
        : null,
      initialDeposit: intake.initialDeposit ?? null,
      applicationFee: intake.applicationFee ?? null,
      scholarships: hasScholarship ? 'Available' : 'Not Available',
    };
  }

  private buildIntakeDatesSection(
    currentYearIntakes: UniCourseIntakes[],
  ): IntakeDatesSectionDto {
    const intakes = this.resolveIntakeMonths(currentYearIntakes);
    return {
      hasInfo: intakes.length > 0,
      infoKey: SECTION_META.intakes.infoKey,
      intakes: intakes.length > 0 ? intakes : null,
    };
  }

  private resolveIntakeMonths(intakes: UniCourseIntakes[]): string[] {
    const order = new Map<MonthName, number>(MONTH_NAMES.map((m, i) => [m, i]));

    const months = intakes
      .map((r) => {
        const m = Number(r.intakeMonth);
        return m >= 1 && m <= 12 ? MONTH_NAMES[m - 1] : null;
      })
      .filter((m): m is MonthName => m !== null);

    return [...new Set(months)].sort(
      (a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99),
    );
  }

  // ─── DTO builders ─────────────────────────────────────────────────────────

  private buildUniversity(
    uni: SysUniversities | undefined,
  ): UniversityDetailsDto {
    return {
      uniId: uni?.id ?? '',
      uniName: uni?.uniName ?? '',
      uniLogoUrl: uni?.logoUrl ?? null,
      uniCoverImageUrl: uni?.coverImageUrl ?? null,
    };
  }

  private buildTags(uni: UniTagSource | undefined): CourseTagDto[] {
    const tags: CourseTagDto[] = [];

    if (uni?.establishedYear != null) {
      tags.push({ label: `Estd. ${uni.establishedYear}`, type: 'established' });
    }
    if (uni?.universityType) {
      tags.push({ label: uni.universityType.toUpperCase(), type: 'type' });
    }

    const city = uni?.SysCity?.cityName;
    const country = uni?.SysCountry?.countryName;
    if (city || country) {
      tags.push({
        label: [city, country].filter(Boolean).join(', '),
        type: 'location',
      });
    }

    return tags;
  }

  private buildAboutUs(
    uni: UniAboutSource | undefined,
  ): { description: string[] } | null {
    if (!uni?.aboutUs) return null;
    return { description: uni.aboutUs.split(/\n\n+/).filter(Boolean) };
  }

  private buildCampusLife(
    uni: UniCampusSource | undefined,
  ): CampusLifeMediaDto | null {
    if (!uni?.campusLifeLinks?.length) return null;
    const videoUrl = this.parseCampusVideoUrls(uni.campusLifeLinks);
    return videoUrl.length > 0
      ? { media: { videoUrl } }
      : { media: { videoUrl: null } };
  }

  private parseCampusVideoUrls(urls: string[]): string[] {
    return urls.flatMap((raw) =>
      raw
        .split(',')
        .map((part) =>
          part
            .trim()
            .replace(/^["'`\\]+|["'`\\]+$/g, '')
            .trim(),
        )
        .filter(Boolean),
    );
  }

  private buildLocation(uni: UniLocationSource | undefined): LocationDto {
    return {
      city: uni?.SysCity?.cityName ?? null,
      country: uni?.SysCountry?.countryName ?? null,
      state: uni?.SysState?.stateName ?? null,
      address: uni?.address ?? null,
      coordinates: this.parseCoordinates(uni?.locationMapMetaData),
    };
  }

  private parseCoordinates(
    raw: string | undefined,
  ): LocationCoordinatesDto | null {
    if (!raw?.trim()) return null;
    try {
      const url = new URL(raw.trim());
      return { link: url.href }; // normalized href — strips trailing spaces, ensures valid form
    } catch {
      return null;
    }
  }
}
