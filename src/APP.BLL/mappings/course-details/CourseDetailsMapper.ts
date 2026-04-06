import { Injectable } from '@nestjs/common';
import type { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import type { SysUniversities } from '@entity/entities/SysUniversities.entity';
import { CourseDetailsResponseDto } from '@shared/dtos/course-details/CourseDetailsResponseDto';
import {
  CourseDetailsDto,
  AcademicRequirementsContentDto,
  FeesAndScholarshipsItemsDto,
  TuitionFeesDto,
  ScholarshipDetailsDto,
} from '@shared/dtos/course-details/CourseDetailsDto';
import {
  MetaItemDto,
  MetaInformationItemDto,
} from '@shared/dtos/course-details/MetaItemDto';
import {
  MetaDataItem,
  parseMetaDataItems,
} from '@shared/dtos/course-details/MetaDataItem.type';

/** English month names only (no year) — used for `intakeDates.intakes`. */
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

const COURSE_DETAIL_TABS: { key: string; label: string }[] = [
  { key: 'aboutUs', label: 'About Us' },
  { key: 'campusLife', label: 'Campus Life' },
  { key: 'location', label: 'Location' },
  { key: 'academicRequirements', label: 'Academic Info' },
  { key: 'feesAndScholarships', label: 'Fees & Scholarships' },
  { key: 'intakeDates', label: 'Intake Dates' },
];

// Subtitle constants — single source of truth, eliminates casing bugs
const MetaSubtitles = {
  FEES: 'feesMetaData',
  SCHOLARSHIPS: 'scholarshipsMetaData',
} as const;

interface AcademicSection {
  hasInfo: boolean;
  infoKey: 'academicRequirementsMetaData';
  requirements: AcademicRequirementsContentDto | undefined;
}

interface FeesSection {
  hasInfo: boolean;
  infoKey: 'feesAndScholarshipsMetaData';
  items: FeesAndScholarshipsItemsDto | undefined;
}

interface IntakeDatesSection {
  hasInfo: boolean;
  infoKey: 'intakeDatesMetaData';
  intakes: string[] | undefined;
}

interface CourseDetailSections {
  academic: AcademicSection;
  fees: FeesSection;
  intakeDates: IntakeDatesSection;
}

interface UniTagSource {
  establishedYear?: number;
  universityType?: string;
  SysCity?: { cityName?: string };
  SysCountry?: { countryName?: string };
}

interface ResolvedTuitionData {
  explicitFrequency: string | null;
  rawAmount: string | null;
  currency: string;
}

@Injectable()
export class CourseDetailsMapper {
  toCourseDetailsResponse(
    intake: UniCourseIntakes,
    allCourseIntakes: UniCourseIntakes[],
  ): CourseDetailsResponseDto {
    const sections = this.buildCourseDetailSections(intake, allCourseIntakes);
    return {
      courseDetails: this.toCourseDetailsDto(intake, sections),
      meta: this.buildMeta(intake, sections),
    };
  }

  private buildCourseDetailSections(
    intake: UniCourseIntakes,
    allCourseIntakes: UniCourseIntakes[],
  ): CourseDetailSections {
    return {
      academic: this.buildAcademicRequirementsSection(intake),
      fees: this.buildFeesAndScholarshipsSection(intake),
      intakeDates: this.buildIntakeDatesSection(intake, allCourseIntakes),
    };
  }

  private toCourseDetailsDto(
    intake: UniCourseIntakes,
    sections: CourseDetailSections,
  ): CourseDetailsDto {
    const course = intake.UniCourse;
    const uni = course?.SysUniversity;

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
      academicRequirements: sections.academic,
      feesAndScholarships: sections.fees,
      intakeDates: sections.intakeDates,
    };
  }

  private isMetadataPresent(raw: unknown): boolean {
    if (raw == null) return false;
    if (Array.isArray(raw)) return raw.length > 0;
    if (typeof raw === 'object') return Object.keys(raw as object).length > 0;
    if (typeof raw === 'string') return raw.trim().length > 0;
    return true;
  }

  private rankingHasInfo(uni: SysUniversities | undefined): boolean {
    return this.isMetadataPresent(uni?.rankingMetaData);
  }

  private buildMeta(
    intake: UniCourseIntakes,
    sections: CourseDetailSections,
  ): MetaItemDto[] {
    const course = intake.UniCourse;
    const uni = course?.SysUniversity;
    const meta: MetaItemDto[] = [];

    if (this.rankingHasInfo(uni)) {
      // rankingMetaData is MetaDataItem[] on the entity — no cast needed
      const rankingInformation = parseMetaDataItems(uni!.rankingMetaData);
      if (rankingInformation.length > 0) {
        meta.push({ infoKey: 'rankingMetaData', title: 'Ranking', information: rankingInformation });
      }
    }

    const { academic, fees, intakeDates: intakes } = sections;

    if (academic.hasInfo) {
      const academicInformation = this.metaInformationForAcademic(intake, academic);
      if (academicInformation.length > 0) {
        meta.push({
          infoKey: 'academicRequirementsMetaData',
          title: 'Academic Requirements',
          information: academicInformation,
        });
      }
    }

    if (fees.hasInfo) {
      const feesInformation = this.metaInformationForFees(intake);
      if (feesInformation.length > 0) {
        meta.push({
          infoKey: 'feesAndScholarshipsMetaData',
          title: 'Fees & Scholarships',
          information: feesInformation,
        });
      }
    }

    if (intakes.hasInfo) {
      const intakeInformation = this.metaInformationForIntakes(intake, intakes);
      if (intakeInformation.length > 0) {
        meta.push({ infoKey: 'intakeDatesMetaData', title: 'Intake Dates', information: intakeInformation });
      }
    }

    return meta;
  }

  // ─── Academic ────────────────────────────────────────────────────────────────

  private metaInformationForAcademic(
    intake: UniCourseIntakes,
    section: AcademicSection,
  ): MetaDataItem[] {
    // requirementMetaData is not in scope for MetaDataItem[] yet — kept as unknown read
    const raw: unknown = intake.UniCourse?.requirementMetaData;
    const parsed = parseMetaDataItems(raw);
    if (parsed.length > 0) return parsed;

    const req = section.requirements;
    if (!req) return [];
    return this.metaInformationFromAcademicRequirements(req);
  }

  private metaInformationFromAcademicRequirements(
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
      const parts: string[] = [e.testName];
      if (e.minOverallValue) parts.push(`Overall: ${e.minOverallValue}`);
      if (e.minSectionValue) parts.push(`Section: ${e.minSectionValue}`);
      return parts.join(' — ');
    });
    if (englishLines.length > 0) {
      out.push({ subtitle: 'English requirements', description: englishLines });
    }

    return out;
  }

  // ─── Fees ────────────────────────────────────────────────────────────────────

  private metaInformationForFees(intake: UniCourseIntakes): MetaDataItem[] {
    // feesMetaData is MetaDataItem[] on the entity — parse at boundary, no cast
    const fromSchema = parseMetaDataItems(intake.feesMetaData);
    const fromNarrative = fromSchema.length > 0 ? fromSchema : this.feesMetaFromIntakeColumns(intake);
    const withRelational = this.upsertMetaBlock(
      fromNarrative,
      MetaSubtitles.SCHOLARSHIPS,
      this.linesFromRelationalScholarships(intake),
      'last',
    );
    return withRelational;
  }

  private feesMetaFromIntakeColumns(intake: UniCourseIntakes): MetaDataItem[] {
    const lines = this.linesFeesMetaFromIntakeColumns(intake);
    if (lines.length === 0) return [];
    return [{ subtitle: MetaSubtitles.FEES, description: lines }];
  }

  private linesFeesMetaFromIntakeColumns(intake: UniCourseIntakes): string[] {
    const { explicitFrequency, rawAmount, currency } = this.resolveTuitionData(intake);
    const amount = this.formatCurrencyAmount(rawAmount);
    const freqLabel = (explicitFrequency ?? 'yearly').trim();

    const lines: string[] = [];
    const core = [amount, currency].filter(Boolean).join(' ');
    if (core) {
      lines.push(freqLabel ? `Tuition: ${core} (${freqLabel})` : `Tuition: ${core}`);
    } else if (currency) {
      lines.push(`Currency: ${currency}`);
    }

    const dep = this.formatCurrencyAmount(intake.initialDeposit ?? undefined);
    if (dep) lines.push(currency ? `Initial deposit: ${dep} ${currency}` : `Initial deposit: ${dep}`);

    const app = this.formatCurrencyAmount(intake.applicationFee ?? undefined);
    if (app) lines.push(currency ? `Application fee: ${app} ${currency}` : `Application fee: ${app}`);

    return lines;
  }

  private linesFromRelationalScholarships(intake: UniCourseIntakes): string[] {
    const rows = (intake.CourseIntakeScholarship ?? []).filter((s) => s.isActive);
    const lines: string[] = [];
    for (const s of rows) {
      // scholarshipMetaData is MetaDataItem[] on entity — no cast needed
      const fromMeta = parseMetaDataItems(s.scholarshipMetaData);
      for (const item of fromMeta) {
        lines.push(...item.description.map((d) => this.formatScholarshipLine(item.subtitle, d)));
      }
    }
    return lines;
  }

  private formatScholarshipLine(subtitle: string, detail: string): string {
    return `${subtitle}: ${detail}`;
  }

  private intakeHasRelationalScholarshipContent(intake: UniCourseIntakes): boolean {
    return (intake.CourseIntakeScholarship ?? []).some(
      (s) => s.isActive && parseMetaDataItems(s.scholarshipMetaData).length > 0,
    );
  }

  // ─── Generic upsert helper (replaces two duplicated merge patterns) ──────────

  private upsertMetaBlock(
    items: MetaDataItem[],
    subtitle: string,
    lines: string[],
    position: 'first' | 'last' = 'last',
  ): MetaDataItem[] {
    if (lines.length === 0) return items;
    const idx = items.findIndex((i) => i.subtitle === subtitle);
    if (idx >= 0) {
      const next = [...items];
      next[idx] = { ...items[idx], description: [...items[idx].description, ...lines] };
      return next;
    }
    const block: MetaDataItem = { subtitle, description: lines };
    return position === 'first' ? [block, ...items] : [...items, block];
  }

  // ─── Intake dates ─────────────────────────────────────────────────────────────

  private metaInformationForIntakes(
    intake: UniCourseIntakes,
    section: IntakeDatesSection,
  ): MetaDataItem[] {
    const lines = section.intakes ?? [];
    if (lines.length > 0) return [{ subtitle: 'intakeDates', description: lines }];
    // intakeMetaData kept as unknown — its shape is not MetaDataItem[]
    return parseMetaDataItems(intake.intakeMetaData);
  }

  // ─── Academic section builder ─────────────────────────────────────────────────

  private buildAcademicRequirementsContent(
    intake: UniCourseIntakes,
  ): AcademicRequirementsContentDto {
    const course = intake.UniCourse;
    if (!course) return { degreeRequirements: [], englishRequirements: [] };

    const degreeRequirements: AcademicRequirementsContentDto['degreeRequirements'] = [];

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
      minOverallValue: r.minOverallReq != null ? String(r.minOverallReq) : '',
      minSectionValue: r.minSectionReq != null ? String(r.minSectionReq) : '',
    }));

    return { degreeRequirements, englishRequirements };
  }

  private mergeRequirementsFromJson(
    intake: UniCourseIntakes,
    entityReq: AcademicRequirementsContentDto,
  ): AcademicRequirementsContentDto {
    // requirementMetaData not yet typed as MetaDataItem[] — read as unknown
    const raw: unknown = intake.UniCourse?.requirementMetaData;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return entityReq;
    const nested = (raw as Record<string, unknown>).requirements as
      | Partial<AcademicRequirementsContentDto>
      | undefined;
    if (!nested) return entityReq;
    return {
      degreeRequirements: nested.degreeRequirements?.length
        ? (nested.degreeRequirements as AcademicRequirementsContentDto['degreeRequirements'])
        : entityReq.degreeRequirements,
      englishRequirements: nested.englishRequirements?.length
        ? (nested.englishRequirements as AcademicRequirementsContentDto['englishRequirements'])
        : entityReq.englishRequirements,
    };
  }

  private buildAcademicRequirementsSection(intake: UniCourseIntakes): AcademicSection {
    const course = intake.UniCourse;
    const hasInfo = this.isMetadataPresent(course?.requirementMetaData);
    if (!hasInfo) {
      return { hasInfo: false, infoKey: 'academicRequirementsMetaData', requirements: undefined };
    }
    const entity = this.buildAcademicRequirementsContent(intake);
    const requirements = this.mergeRequirementsFromJson(intake, entity);
    return { hasInfo: true, infoKey: 'academicRequirementsMetaData', requirements };
  }

  // ─── Fees section builder ─────────────────────────────────────────────────────

  private resolveTuitionData(intake: UniCourseIntakes): ResolvedTuitionData {
    // feesMetaData is now MetaDataItem[] — tuitionFees lives in scalar columns only
    // legacy tuitionFees nested object no longer expected in new schema rows
    const explicitFrequency: string | null = null;
    const rawAmount = intake.tuitionFee ?? null;
    const currency = (intake.currency ?? '').trim();
    return { explicitFrequency, rawAmount, currency };
  }

  private buildFeesAndScholarshipsSection(intake: UniCourseIntakes): FeesSection {
    const { explicitFrequency, rawAmount, currency } = this.resolveTuitionData(intake);

    const tuitionFees: FeesAndScholarshipsItemsDto['tuitionFees'] = {
      amount: this.formatCurrencyAmount(rawAmount),
      currency: currency || null,
      frequency: explicitFrequency ?? 'yearly',
    };

    const hasInfo =
      this.isMetadataPresent(intake.feesMetaData) ||
      this.intakeHasRelationalScholarshipContent(intake);

    const hasTuitionDetails = !!(tuitionFees.amount || tuitionFees.currency || explicitFrequency);

    const initialDeposit = this.formatCurrencyAmount(intake.initialDeposit ?? undefined);
    const applicationFee = this.formatCurrencyAmount(intake.applicationFee ?? undefined);
    const relationalScholarship = this.mapRelationalScholarship(intake);

    const hasColumnFeeDetails =
      hasTuitionDetails || !!initialDeposit || !!applicationFee || relationalScholarship != null;

    const shouldShowItems = hasInfo || hasColumnFeeDetails;

    const items: FeesAndScholarshipsItemsDto | undefined = shouldShowItems
      ? {
          tuitionFees: hasTuitionDetails ? tuitionFees : undefined,
          initialDeposit: initialDeposit ?? undefined,
          applicationFee: applicationFee ?? undefined,
          scholarships: relationalScholarship,
          scholarshipsSummary: undefined,
        }
      : undefined;

    return { hasInfo, infoKey: 'feesAndScholarshipsMetaData', items };
  }

  private mapRelationalScholarship(intake: UniCourseIntakes): ScholarshipDetailsDto | undefined {
    const rows = intake.CourseIntakeScholarship ?? [];
    const currency = intake.currency ?? null;
    for (const s of rows) {
      const scholarshipAmount = this.formatCurrencyAmount(s.amount ?? undefined);
      if (!scholarshipAmount) continue;
      return {
        scholarshipName: (s.name ?? '').trim() || undefined,
        scholarshipAmount,
        currency: currency ?? undefined,
        scholarshipType: (s.amountType ?? '').trim() || undefined,
      };
    }
    return undefined;
  }

  // ─── Intake dates section builder ─────────────────────────────────────────────

  private buildIntakeDatesSection(
    intake: UniCourseIntakes,
    allCourseIntakes: UniCourseIntakes[],
  ): IntakeDatesSection {
    const intakes = this.intakeMonthsDisplayOnly(intake, allCourseIntakes);
    return {
      hasInfo: intakes.length > 0,
      infoKey: 'intakeDatesMetaData',
      intakes: intakes.length > 0 ? intakes : undefined,
    };
  }

  private intakeMonthsDisplayOnly(
    intake: UniCourseIntakes,
    allCourseIntakes: UniCourseIntakes[],
  ): string[] {
    const combined: string[] = [];
    combined.push(...this.monthLabelsFromAllCourseIntakes(allCourseIntakes));

    const raw: unknown = intake.intakeMetaData;
    if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      if (Array.isArray(o.months) && o.months.every((x) => typeof x === 'number')) {
        combined.push(
          ...(o.months as number[])
            .filter((m) => m >= 1 && m <= 12)
            .map((m) => MONTH_NAMES[m - 1]),
        );
      }
    }

    combined.push(
      ...this.linesFromIntakeMetaDataStrings(intake)
        .map((s) => this.toMonthOnlyLabel(s))
        .filter((s) => s.length > 0),
    );

    return this.uniqueSortedMonthLabels(combined);
  }

  private monthLabelsFromAllCourseIntakes(rows: UniCourseIntakes[]): string[] {
    return rows
      .map((r) => this.monthLabelFromEntityIntakeMonth(r.intakeMonth))
      .filter((l): l is string => l !== null);
  }

  private linesFromIntakeMetaDataStrings(intake: UniCourseIntakes): string[] {
    const raw: unknown = intake.intakeMetaData;
    if (raw == null) return [];
    if (Array.isArray(raw) && raw.every((x) => typeof x === 'string')) return raw as string[];
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      if (Array.isArray(o.intakes) && o.intakes.every((x) => typeof x === 'string')) {
        return o.intakes as string[];
      }
    }
    return parseMetaDataItems(raw).flatMap((i) => i.description);
  }

  private monthLabelFromEntityIntakeMonth(month: number): string | null {
    if (month < 1 || month > 12) return null;
    return MONTH_NAMES[month - 1];
  }

  private toMonthOnlyLabel(s: string): string {
    const t = s.trim();
    const dashYear = /^([A-Za-z]+)\s*-\s*\d{4}$/.exec(t);
    if (dashYear) return this.canonicalMonthName(dashYear[1]) ?? dashYear[1];
    return this.canonicalMonthName(t) ?? t;
  }

  private canonicalMonthName(word: string): string | undefined {
    const idx = MONTH_NAMES.findIndex((n) => n.toLowerCase() === word.trim().toLowerCase());
    return idx >= 0 ? MONTH_NAMES[idx] : undefined;
  }

  private uniqueSortedMonthLabels(labels: string[]): string[] {
    const order = new Map<string, number>(MONTH_NAMES.map((m, i) => [m, i]));
    return [...new Set(labels)].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
  }

  // ─── Shared helpers ───────────────────────────────────────────────────────────

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

  private buildTags(uni: UniTagSource | undefined): { label: string; type: string }[] {
    const tags: { label: string; type: string }[] = [];
    if (uni?.establishedYear != null) {
      tags.push({ label: `Estd. ${uni.establishedYear}`, type: 'established' });
    }
    if (uni?.universityType) {
      tags.push({ label: uni.universityType.toUpperCase(), type: 'type' });
    }
    const city = uni?.SysCity?.cityName;
    const country = uni?.SysCountry?.countryName;
    if (city || country) {
      tags.push({ label: [city, country].filter(Boolean).join(', '), type: 'location' });
    }
    return tags;
  }

  private buildAboutUs(uni: { aboutUs?: string } | undefined): { description: string[] } | undefined {
    if (!uni?.aboutUs) return undefined;
    return { description: uni.aboutUs.split(/\n\n+/).filter(Boolean) };
  }

  private buildCampusLife(
    uni: { campusLifeLinks?: string[] } | undefined,
  ): { media: { videoUrl?: string[] } } | undefined {
    if (!uni?.campusLifeLinks?.length) return undefined;
    const videoUrl = this.uniqueCampusVideoUrls(uni.campusLifeLinks);
    return videoUrl.length > 0 ? { media: { videoUrl } } : undefined;
  }

  private normalizeCampusVideoUrl(raw: string): string {
    return raw.trim().replace(/^["'`\\]+|["'`\\]+$/g, '').trim();
  }

  private uniqueCampusVideoUrls(urls: string[]): string[] {
    const out: string[] = [];
    for (const raw of urls) {
      for (const part of raw.split(',')) {
        const u = this.normalizeCampusVideoUrl(part);
        if (u) out.push(u);
      }
    }
    return out;
  }

  private buildLocation(
    uni:
      | {
          address?: string;
          SysCity?: { cityName?: string };
          SysCountry?: { countryName?: string };
          SysState?: { stateName?: string };
          locationMapMetaData?: Record<string, unknown>;
        }
      | undefined,
  ) {
    const raw = uni?.locationMapMetaData;
    let coordinates: { latitude?: number; longitude?: number; link?: string | null } | null = null;

    if (raw && typeof raw === 'object') {
      const lat = typeof raw.latitude === 'number' ? raw.latitude
        : typeof raw.lat === 'number' ? raw.lat : undefined;
      const lng = typeof raw.longitude === 'number' ? raw.longitude
        : typeof raw.lng === 'number' ? raw.lng : undefined;
      const link = typeof raw.href === 'string' ? raw.href
        : typeof raw.link === 'string' ? raw.link : null;

      if (lat != null || lng != null || link != null) {
        coordinates = {
          ...(lat !== undefined ? { latitude: lat } : {}),
          ...(lng !== undefined ? { longitude: lng } : {}),
          ...(link != null ? { link } : {}),
        };
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