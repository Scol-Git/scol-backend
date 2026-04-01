import { Injectable } from '@nestjs/common';
import type { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import type { SysUniversities } from '@entity/entities/SysUniversities.entity';
import type { CourseIntakeScholarships } from '@entity/entities/CourseIntakeScholarships.entity';
import { CourseDetailsResponseDto } from '@shared/dtos/course-details/CourseDetailsResponseDto';
import {
  CourseDetailsDto,
  AcademicRequirementsContentDto,
  FeesAndScholarshipsItemsDto,
} from '@shared/dtos/course-details/CourseDetailsDto';
import {
  MetaItemDto,
  MetaInformationItemDto,
} from '@shared/dtos/course-details/MetaItemDto';

const COURSE_DETAIL_TABS: { key: string; label: string }[] = [
  { key: 'aboutUs', label: 'About Us' },
  { key: 'campusLife', label: 'Campus Life' },
  { key: 'location', label: 'Location' },
  { key: 'academicRequirements', label: 'Academic Info' },
  { key: 'feesAndScholarships', label: 'Fees & Scholarships' },
  { key: 'intakeDates', label: 'Intake Dates' },
];

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
        hasInfo: this.rankingHasInfo(uni),
        infoKey: 'rankingMetaData',
      },
      university: {
        uniId: uni?.id ?? '',
        uniName: uni?.uniName ?? '',
        uniLogoUrl: uni?.logoUrl ?? null,
        uniCoverImageUrl: uni?.coverImageUrl ?? null,
      },
      tags: this.buildTags(uni),
      tabs: COURSE_DETAIL_TABS.map((t) => ({ ...t })),
      aboutUs: this.buildAboutUs(uni),
      campusLife: this.buildCampusLife(uni),
      location: this.buildLocation(uni),
      academicRequirements: this.buildAcademicRequirementsSection(intake),
      feesAndScholarships: this.buildFeesAndScholarshipsSection(
        intake,
        scholarships,
      ),
      intakeDates: this.buildIntakeDatesSection(intake),
    };
  }

  /** Tab / meta blocks only when the corresponding JSONB metadata blob exists and is non-empty. */
  private isMetadataPresent(raw: unknown): boolean {
    if (raw == null) return false;
    if (typeof raw === 'object') {
      if (Array.isArray(raw)) return raw.length > 0;
      return Object.keys(raw as Record<string, unknown>).length > 0;
    }
    if (typeof raw === 'string') return raw.trim().length > 0;
    return true;
  }

  private rankingHasInfo(uni: SysUniversities | undefined): boolean {
    return this.isMetadataPresent(uni?.rankingMetaData);
  }

  private buildMeta(intake: UniCourseIntakes): MetaItemDto[] {
    const course = intake.UniCourse;
    const uni = course?.SysUniversity;
    const scholarships = intake.CourseIntakeScholarship ?? [];
    const meta: MetaItemDto[] = [];

    if (this.rankingHasInfo(uni)) {
      meta.push({
        infoKey: 'rankingMetaData',
        title: 'Ranking',
        information: this.metaInformationForRanking(uni!),
      });
    }

    const academic = this.buildAcademicRequirementsSection(intake);
    if (academic.hasInfo) {
      meta.push({
        infoKey: 'academicRequirementsMetaData',
        title: 'Academic Requirements',
        information: this.metaInformationForAcademic(intake, academic),
      });
    }

    const fees = this.buildFeesAndScholarshipsSection(intake, scholarships);
    if (fees.hasInfo) {
      meta.push({
        infoKey: 'feesAndScholarshipsMetaData',
        title: 'Fees & Scholarships',
        information: this.metaInformationForFees(intake, scholarships, fees),
      });
    }

    const intakes = this.buildIntakeDatesSection(intake);
    if (intakes.hasInfo) {
      meta.push({
        infoKey: 'intakeDatesMetaData',
        title: 'Intake Dates',
        information: this.metaInformationForIntakes(intake, intakes),
      });
    }

    return meta;
  }

  /** Only JSONB-backed content; no template text when parse yields nothing. */
  private metaInformationForRanking(uni: SysUniversities): MetaInformationItemDto[] {
    return this.tryParseMetaInformation(uni.rankingMetaData);
  }

  private metaInformationForAcademic(
    intake: UniCourseIntakes,
    _section: ReturnType<CourseDetailsMapper['buildAcademicRequirementsSection']>,
  ): MetaInformationItemDto[] {
    const meta = intake.UniCourse?.requirementMetaData as
      | Record<string, unknown>
      | undefined;
    if (meta && Array.isArray(meta.information)) {
      return meta.information as MetaInformationItemDto[];
    }
    const parsed = this.tryParseMetaInformation(meta);
    return parsed;
  }

  private metaInformationForFees(
    intake: UniCourseIntakes,
    _scholarships: CourseIntakeScholarships[],
    _section: ReturnType<CourseDetailsMapper['buildFeesAndScholarshipsSection']>,
  ): MetaInformationItemDto[] {
    const meta = intake.feesMetaData as Record<string, unknown> | undefined;
    if (meta && Array.isArray(meta.information)) {
      return meta.information as MetaInformationItemDto[];
    }
    const parsed = this.tryParseMetaInformation(meta);
    return parsed;
  }

  private metaInformationForIntakes(
    intake: UniCourseIntakes,
    _section: ReturnType<CourseDetailsMapper['buildIntakeDatesSection']>,
  ): MetaInformationItemDto[] {
    const meta = intake.intakeMetaData as Record<string, unknown> | undefined;
    if (meta && Array.isArray(meta.information)) {
      return meta.information as MetaInformationItemDto[];
    }
    const parsed = this.tryParseMetaInformation(meta);
    return parsed;
  }

  /**
   * Accepts JSONB stored as Meta blocks, legacy paragraph arrays, or wrapper objects.
   */
  private tryParseMetaInformation(raw: unknown): MetaInformationItemDto[] {
    if (raw == null) {
      return [];
    }
    if (Array.isArray(raw)) {
      if (raw.length === 0) {
        return [];
      }
      if (typeof raw[0] === 'string') {
        return [{ description: raw as string[] }];
      }
      if (
        typeof raw[0] === 'object' &&
        raw[0] !== null &&
        'description' in (raw[0] as object)
      ) {
        return raw as MetaInformationItemDto[];
      }
    }
    if (typeof raw === 'object' && raw !== null) {
      const o = raw as Record<string, unknown>;
      if (Array.isArray(o.information)) {
        return o.information as MetaInformationItemDto[];
      }
      if (Array.isArray(o.paragraphs)) {
        return [{ description: o.paragraphs as string[] }];
      }
    }
    return [];
  }

  private buildAcademicRequirementsContent(
    intake: UniCourseIntakes,
  ): AcademicRequirementsContentDto {
    const course = intake.UniCourse;
    const degreeRequirements: AcademicRequirementsContentDto['degreeRequirements'] =
      [];
    if (!course) {
      return { degreeRequirements: [], englishRequirements: [] };
    }
    if (course.minSysAcademicDegree?.degreeName && course.minGpa != null) {
      degreeRequirements.push({
        degreeName: course.minSysAcademicDegree.degreeName,
        label: 'GPA | CGPA',
        minValue: String(course.minGpa),
      });
    }
    if (course.higherSysAcademicDegree?.degreeName && course.higherGpa != null) {
      degreeRequirements.push({
        degreeName: course.higherSysAcademicDegree.degreeName,
        label: 'GPA | CGPA',
        minValue: String(course.higherGpa),
      });
    }
    const englishRequirements = (course.CourseEngReq ?? []).map((r) => ({
      testName: r.SysEnglishTest?.testName ?? 'English test',
      minOverallValue:
        r.minOverallReq != null ? String(r.minOverallReq) : '',
      minSectionValue:
        r.minSectionReq != null ? String(r.minSectionReq) : '',
    }));
    return { degreeRequirements, englishRequirements };
  }

  private mergeRequirementsFromJson(
    intake: UniCourseIntakes,
    entityReq: AcademicRequirementsContentDto,
  ): AcademicRequirementsContentDto {
    const raw = intake.UniCourse?.requirementMetaData as
      | Record<string, unknown>
      | undefined;
    const nested = raw?.requirements as
      | Partial<AcademicRequirementsContentDto>
      | undefined;
    if (!nested) {
      return entityReq;
    }
    return {
      degreeRequirements:
        nested.degreeRequirements?.length ?
          (nested.degreeRequirements as AcademicRequirementsContentDto['degreeRequirements'])
        : entityReq.degreeRequirements,
      englishRequirements:
        nested.englishRequirements?.length ?
          (nested.englishRequirements as AcademicRequirementsContentDto['englishRequirements'])
        : entityReq.englishRequirements,
    };
  }

  private buildAcademicRequirementsSection(intake: UniCourseIntakes) {
    const course = intake.UniCourse;
    const hasInfo = this.isMetadataPresent(course?.requirementMetaData);
    if (!hasInfo) {
      return {
        hasInfo: false,
        infoKey: 'academicRequirementsMetaData' as const,
        requirements: undefined,
      };
    }
    const entity = this.buildAcademicRequirementsContent(intake);
    const requirements = this.mergeRequirementsFromJson(intake, entity);
    return {
      hasInfo: true,
      infoKey: 'academicRequirementsMetaData' as const,
      requirements,
    };
  }

  /** Strips redundant trailing zeros from numeric amount strings (e.g. "14000.00" → "14000"). */
  private formatCurrencyAmount(value: string | null | undefined): string | null {
    if (value == null || value === '') return null;
    const s = String(value).trim();
    if (!/^-?\d+(\.\d+)?$/.test(s)) return s;
    const neg = s.startsWith('-');
    const abs = neg ? s.slice(1) : s;
    const [intPart, decPart = ''] = abs.split('.');
    if (!decPart) return neg ? `-${intPart}` : intPart;
    const decTrimmed = decPart.replace(/0+$/, '');
    if (!decTrimmed.length) return neg ? `-${intPart}` : intPart;
    return neg ? `-${intPart}.${decTrimmed}` : `${intPart}.${decTrimmed}`;
  }

  private buildFeesAndScholarshipsSection(
    intake: UniCourseIntakes,
    _scholarships: CourseIntakeScholarships[],
  ) {
    const feesJson = intake.feesMetaData as
      | Record<string, unknown>
      | undefined;
    const tuitionFromJson = feesJson?.tuitionFees as
      | Record<string, unknown>
      | undefined;

    const explicitFrequency =
      (tuitionFromJson?.frequency as string | undefined) ??
      (feesJson?.frequency as string | undefined) ??
      null;

    const rawAmount =
      tuitionFromJson?.amount !== undefined && tuitionFromJson?.amount !== null
        ? String(tuitionFromJson.amount)
        : intake.tuitionFee ?? null;

    const tuitionFees: FeesAndScholarshipsItemsDto['tuitionFees'] = {
      amount: this.formatCurrencyAmount(rawAmount),
      currency:
        (tuitionFromJson?.currency as string | undefined) ??
        intake.currency ??
        null,
      frequency: explicitFrequency ?? 'yearly',
    };

    const scholarshipsSummary: string | null =
      (feesJson?.scholarships as string | undefined) ??
      (feesJson?.scholarshipsSummary as string | undefined) ??
      null;

    const hasInfo = this.isMetadataPresent(intake.feesMetaData);

    const hasTuitionDetails = !!(
      tuitionFees.amount ||
      tuitionFees.currency ||
      explicitFrequency != null
    );

    const items: FeesAndScholarshipsItemsDto | undefined =
      hasInfo ?
        {
          tuitionFees: hasTuitionDetails ? tuitionFees : undefined,
          scholarships: scholarshipsSummary ?? undefined,
        }
      : undefined;

    return {
      hasInfo,
      infoKey: 'feesAndScholarshipsMetaData' as const,
      items,
    };
  }

  /** Intake month labels only from `intakeMetaData.intakes` / `.labels`; no derivation from DB rows. */
  private buildIntakeMonthLabels(intake: UniCourseIntakes): string[] {
    const meta = intake.intakeMetaData as Record<string, unknown> | undefined;
    if (!meta) return [];
    if (Array.isArray(meta.intakes) && meta.intakes.every((x) => typeof x === 'string')) {
      return meta.intakes as string[];
    }
    if (Array.isArray(meta.labels) && meta.labels.every((x) => typeof x === 'string')) {
      return meta.labels as string[];
    }
    return [];
  }

  private buildIntakeDatesSection(intake: UniCourseIntakes) {
    const hasInfo = this.isMetadataPresent(intake.intakeMetaData);
    const intakes = hasInfo ? this.buildIntakeMonthLabels(intake) : undefined;
    return {
      hasInfo,
      infoKey: 'intakeDatesMetaData' as const,
      intakes,
    };
  }

  private buildTags(uni:
    | {
        establishedYear?: number;
        universityType?: string;
        SysCity?: { cityName?: string };
        SysCountry?: { countryName?: string };
      }
    | undefined) {
    const tags: { label: string; type: string }[] = [];
    if (uni?.establishedYear != null) {
      tags.push({
        label: `Estd. ${uni.establishedYear}`,
        type: 'established',
      });
    }
    if (uni?.universityType) {
      tags.push({
        label: uni.universityType.toUpperCase(),
        type: 'type',
      });
    }
    const city = uni?.SysCity?.cityName;
    const country = uni?.SysCountry?.countryName;
    if (city || country) {
      const label = [city, country].filter(Boolean).join(', ');
      tags.push({ label, type: 'location' });
    }
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
    const raw = uni?.locationMapMetaData;
    let coordinates: {
      latitude?: number;
      longitude?: number;
      link?: string | null;
    } | null = null;
    if (raw && typeof raw === 'object') {
      const lat =
        typeof raw.latitude === 'number' ? raw.latitude
        : typeof raw.lat === 'number' ? raw.lat
        : undefined;
      const lng =
        typeof raw.longitude === 'number' ? raw.longitude
        : typeof raw.lng === 'number' ? raw.lng
        : undefined;
      const link =
        typeof raw.href === 'string' ? raw.href
        : typeof raw.link === 'string' ? raw.link
        : null;
      if (lat != null || lng != null || link != null) {
        coordinates = {
          ...(lat !== undefined ? { latitude: lat } : {}),
          ...(lng !== undefined ? { longitude: lng } : {}),
          ...(link != null ? { link } : {}),
        };
      } else {
        coordinates = null;
      }
    }
    return {
      city: uni?.SysCity?.cityName ?? null,
      country: uni?.SysCountry?.countryName ?? null,
      state: uni?.SysState?.stateName ?? null,
      address: uni?.address ?? null,
      coordinates,
    };
  }
}
