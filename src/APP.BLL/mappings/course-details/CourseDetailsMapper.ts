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
  FeesAndScholarshipsItemsDto,
  FeesAndScholarshipsSectionDto,
  IntakeDatesSectionDto,
} from '@shared/dtos/course-details/CourseDetailsDto';
import { MetaItemDto } from '@shared/dtos/course-details/MetaItemDto';
import {
  MetaDataItem,
  parseMetaDataItems,
} from '@shared/dtos/course-details/MetaDataItem.type';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

type MonthName = typeof MONTH_NAMES[number];

const COURSE_DETAIL_TABS: CourseTabDto[] = [
  { key: 'aboutUs',              label: 'About Us' },
  { key: 'campusLife',           label: 'Campus Life' },
  { key: 'location',             label: 'Location' },
  { key: 'academicRequirements', label: 'Academic Info' },
  { key: 'feesAndScholarships',  label: 'Fees & Scholarships' },
  { key: 'intakeDates',          label: 'Intake Dates' },
];

// ─── Local source types ───────────────────────────────────────────────────────

type BaseUni = Pick<
  SysUniversities,
  'establishedYear' | 'universityType'
>;

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

type UniAboutSource    = { aboutUs?: string };
type UniCampusSource   = { campusLifeLinks?: string[] };

// ─── Section interface ────────────────────────────────────────────────────────

interface CourseDetailSections {
  academic:    AcademicRequirementsSectionDto;
  fees:        FeesAndScholarshipsSectionDto;
  intakeDates: IntakeDatesSectionDto;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

@Injectable()
export class CourseDetailsMapper {
  toCourseDetailsResponse(
    intake: UniCourseIntakes,
    allCourseIntakes: UniCourseIntakes[],
  ): CourseDetailsResponseDto {
    const sections = this.buildSections(intake, allCourseIntakes);
    return {
      meta:          this.buildMeta(intake, sections),
      courseDetails: this.buildCourseDetails(intake, sections),
    };
  }

  // ─── Top-level builders ───────────────────────────────────────────────────

  private buildSections(
    intake: UniCourseIntakes,
    allCourseIntakes: UniCourseIntakes[],
  ): CourseDetailSections {
    return {
      academic:    this.buildAcademicSection(intake),
      fees:        this.buildFeesSection(intake),
      intakeDates: this.buildIntakeDatesSection(allCourseIntakes),
    };
  }

  private buildCourseDetails(
    intake: UniCourseIntakes,
    sections: CourseDetailSections,
  ): CourseDetailsDto {
    const uni = intake.UniCourse?.SysUniversity;

    return {
      courseId:             intake.id,
      courseName:           intake.UniCourse?.courseName ?? '',
      ranking:              this.buildRanking(uni),
      university:           this.buildUniversity(uni),
      tags:                 this.buildTags(uni),
      tabs:                 COURSE_DETAIL_TABS.map((t) => ({ ...t })),
      aboutUs:              this.buildAboutUs(uni),
      campusLife:           this.buildCampusLife(uni),
      location:             this.buildLocation(uni),
      academicRequirements: sections.academic,
      feesAndScholarships:  sections.fees,
      intakeDates:          sections.intakeDates,
    };
  }

  // ─── Meta ─────────────────────────────────────────────────────────────────

  private buildMeta(
    intake: UniCourseIntakes,
    sections: CourseDetailSections,
  ): MetaItemDto[] {
    const uni  = intake.UniCourse?.SysUniversity;
    const meta: MetaItemDto[] = [];

    this.pushMetaItem(meta, 'rankingMetaData', 'Ranking',
      parseMetaDataItems(uni?.rankingMetaData),
    );

    if (sections.academic.hasInfo) {
      this.pushMetaItem(meta, 'academicRequirementsMetaData', 'Academic Requirements',
        this.academicMetaItems(intake, sections.academic),
      );
    }

    if (sections.fees.hasInfo) {
      this.pushMetaItem(meta, 'feesAndScholarshipsMetaData', 'Fees & Scholarships',
        this.feesMetaItems(intake),
      );
    }

    if (sections.intakeDates.hasInfo) {
      this.pushMetaItem(meta, 'intakeDatesMetaData', 'Intake Dates',
        this.intakeDatesMetaItems(intake, sections.intakeDates),
      );
    }

    return meta;
  }

  private pushMetaItem(
    meta: MetaItemDto[],
    infoKey: string,
    title: string,
    information: MetaDataItem[],
  ): void {
    if (information.length > 0) {
      meta.push({ infoKey, title, information });
    }
  }

  // ─── Meta items ───────────────────────────────────────────────────────────

  private academicMetaItems(
    intake: UniCourseIntakes,
    section: AcademicRequirementsSectionDto,
  ): MetaDataItem[] {
    const parsed = parseMetaDataItems(intake.UniCourse?.requirementMetaData);
    if (parsed.length > 0) return parsed;
    if (!section.requirements) return [];
    return this.metaItemsFromAcademicContent(section.requirements);
  }

  private metaItemsFromAcademicContent(
    req: AcademicRequirementsContentDto,
  ): MetaDataItem[] {
    const out: MetaDataItem[] = [];

    const degreeLines = req.degreeRequirements.map(
      (d) => `${d.degreeName} — ${d.label}: ${d.minValue}`,
    );
    if (degreeLines.length > 0) {
      out.push({ subtitle: 'Degree requirements', description: degreeLines });
    }

    const englishLines = req.englishRequirements.map((e) => {
      const parts = [e.testName];
      if (e.minOverallValue) parts.push(`Overall: ${e.minOverallValue}`);
      if (e.minSectionValue) parts.push(`Section: ${e.minSectionValue}`);
      return parts.join(' — ');
    });
    if (englishLines.length > 0) {
      out.push({ subtitle: 'English requirements', description: englishLines });
    }

    return out;
  }

  private feesMetaItems(intake: UniCourseIntakes): MetaDataItem[] {
    return [
      ...parseMetaDataItems(intake.feesMetaData),
      ...(intake.CourseIntakeScholarship ?? [])
        .filter((s) => s.isActive)
        .flatMap((s) => parseMetaDataItems(s.scholarshipMetaData)),
    ];
  }

  private intakeDatesMetaItems(
    intake: UniCourseIntakes,
    section: IntakeDatesSectionDto,
  ): MetaDataItem[] {
    const lines = section.intakes ?? [];
    if (lines.length > 0) return [{ subtitle: 'intakeDates', description: lines }];
    return parseMetaDataItems(intake.intakeMetaData);
  }

  // ─── Section builders ─────────────────────────────────────────────────────

  private buildAcademicSection(intake: UniCourseIntakes): AcademicRequirementsSectionDto {
    const hasInfo = this.isMetadataPresent(intake.UniCourse?.requirementMetaData);
    return {
      hasInfo,
      infoKey:      'academicRequirementsMetaData',
      requirements: hasInfo ? this.buildAcademicContent(intake) : undefined,
    };
  }

  private buildAcademicContent(intake: UniCourseIntakes): AcademicRequirementsContentDto {
    const course = intake.UniCourse;
    if (!course) return { degreeRequirements: [], englishRequirements: [] };

    const degreeRequirements: AcademicRequirementsContentDto['degreeRequirements'] = [];

    if (course.minSysAcademicDegree?.degreeName && course.minGpa != null) {
      degreeRequirements.push({
        degreeName: course.minSysAcademicDegree.degreeName,
        label:      (course.minSysAcademicDegree.levelOrder ?? 0) > 1 ? 'CGPA' : 'GPA',
        minValue:   String(course.minGpa),
      });
    }

    if (course.higherSysAcademicDegree?.degreeName && course.higherGpa != null) {
      degreeRequirements.push({
        degreeName: course.higherSysAcademicDegree.degreeName,
        label:      (course.higherSysAcademicDegree.levelOrder ?? 0) > 1 ? 'CGPA' : 'GPA',
        minValue:   String(course.higherGpa),
      });
    }

    const englishRequirements = (course.CourseEngReq ?? []).map((r) => ({
      testName:        r.SysEnglishTest?.testName ?? 'English test',
      minOverallValue: r.minOverallReq != null ? String(r.minOverallReq) : '',
      minSectionValue: r.minSectionReq != null ? String(r.minSectionReq) : '',
    }));

    return { degreeRequirements, englishRequirements };
  }

  private buildFeesSection(intake: UniCourseIntakes): FeesAndScholarshipsSectionDto {
    const hasScholarship = (intake.CourseIntakeScholarship ?? []).some(
      (s) => s.isActive && this.isMetadataPresent(s.scholarshipMetaData),
    );
    const hasInfo = this.isMetadataPresent(intake.feesMetaData) || hasScholarship;

    return {
      hasInfo,
      infoKey: 'feesAndScholarshipsMetaData',
      items:   hasInfo ? this.buildFeesItems(intake, hasScholarship) : undefined,
    };
  }

  private buildFeesItems(
    intake: UniCourseIntakes,
    hasScholarship: boolean,
  ): FeesAndScholarshipsItemsDto {
    return {
      tuitionFees: intake.tuitionFee
        ? { amount: intake.tuitionFee, currency: intake.currency ?? null, frequency: 'yearly' }
        : undefined,
      initialDeposit: intake.initialDeposit ?? undefined,
      applicationFee: intake.applicationFee ?? undefined,
      scholarships:   hasScholarship ? 'Available' : 'Not Available',
    };
  }

  private buildIntakeDatesSection(allCourseIntakes: UniCourseIntakes[]): IntakeDatesSectionDto {
    const intakes = this.resolveIntakeMonths(allCourseIntakes);
    return {
      hasInfo: intakes.length > 0,
      infoKey: 'intakeDatesMetaData',
      intakes: intakes.length > 0 ? intakes : undefined,
    };
  }

  private resolveIntakeMonths(allCourseIntakes: UniCourseIntakes[]): string[] {
    const order = new Map<MonthName, number>(MONTH_NAMES.map((m, i) => [m, i]));

    const months = allCourseIntakes
      .map((r) => {
        const m = Number(r.intakeMonth);
        return m >= 1 && m <= 12 ? MONTH_NAMES[m - 1] : null;
      })
      .filter((m): m is MonthName => m !== null);

    return [...new Set(months)].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
  }

  // ─── DTO builders ─────────────────────────────────────────────────────────

  private buildRanking(uni: SysUniversities | undefined): RankingDto {
    return {
      position: uni?.currRanking ?? null,
      hasInfo:  this.isMetadataPresent(uni?.rankingMetaData),
      infoKey:  'rankingMetaData',
    };
  }

  private buildUniversity(uni: SysUniversities | undefined): UniversityDetailsDto {
    return {
      uniId:            uni?.id ?? '',
      uniName:          uni?.uniName ?? '',
      uniLogoUrl:       uni?.logoUrl ?? null,
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

    const city    = uni?.SysCity?.cityName;
    const country = uni?.SysCountry?.countryName;
    if (city || country) {
      tags.push({ label: [city, country].filter(Boolean).join(', '), type: 'location' });
    }

    return tags;
  }

  private buildAboutUs(uni: UniAboutSource | undefined): { description: string[] } | undefined {
    if (!uni?.aboutUs) return undefined;
    return { description: uni.aboutUs.split(/\n\n+/).filter(Boolean) };
  }

  private buildCampusLife(
    uni: UniCampusSource | undefined,
  ): { media: { videoUrl?: string[] } } | undefined {
    if (!uni?.campusLifeLinks?.length) return undefined;
    const videoUrl = this.parseCampusVideoUrls(uni.campusLifeLinks);
    return videoUrl.length > 0 ? { media: { videoUrl } } : undefined;
  }

  private parseCampusVideoUrls(urls: string[]): string[] {
    return urls.flatMap((raw) =>
      raw
        .split(',')
        .map((part) => part.trim().replace(/^["'`\\]+|["'`\\]+$/g, '').trim())
        .filter(Boolean),
    );
  }

  private buildLocation(uni: UniLocationSource | undefined): LocationDto {
    return {
      city:        uni?.SysCity?.cityName ?? null,
      country:     uni?.SysCountry?.countryName ?? null,
      state:       uni?.SysState?.stateName ?? null,
      address:     uni?.address ?? null,
      coordinates: this.parseCoordinates(uni?.locationMapMetaData),
    };
  }

  private parseCoordinates(raw: string | undefined): LocationCoordinatesDto | null {
    if (!raw) return null;
    try {
      new URL(raw);
      return { link: raw };
    } catch {
      return null;
    }
  }

  // ─── Shared helpers ───────────────────────────────────────────────────────

  private isMetadataPresent(raw: unknown): boolean {
    if (raw == null)             return false;
    if (Array.isArray(raw))      return raw.length > 0;
    if (typeof raw === 'object') return Object.keys(raw as object).length > 0;
    if (typeof raw === 'string') return raw.trim().length > 0;
    return true;
  }
}