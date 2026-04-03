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

  /** Builds academic, fees, and intake sections once per request (shared by DTO + meta). */
  private buildCourseDetailSections(
    intake: UniCourseIntakes,
    allCourseIntakes: UniCourseIntakes[],
  ) {
    return {
      academic: this.buildAcademicRequirementsSection(intake),
      fees: this.buildFeesAndScholarshipsSection(intake),
      intakeDates: this.buildIntakeDatesSection(intake, allCourseIntakes),
    };
  }

  private toCourseDetailsDto(
    intake: UniCourseIntakes,
    sections: ReturnType<CourseDetailsMapper['buildCourseDetailSections']>,
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

  private buildMeta(
    intake: UniCourseIntakes,
    sections: ReturnType<CourseDetailsMapper['buildCourseDetailSections']>,
  ): MetaItemDto[] {
    const course = intake.UniCourse;
    const uni = course?.SysUniversity;
    const meta: MetaItemDto[] = [];

    if (this.rankingHasInfo(uni)) {
      const rankingInformation = this.metaInformationForRanking(uni!);
      if (rankingInformation.length > 0) {
        meta.push({
          infoKey: 'rankingMetaData',
          title: 'Ranking',
          information: rankingInformation,
        });
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
        meta.push({
          infoKey: 'intakeDatesMetaData',
          title: 'Intake Dates',
          information: intakeInformation,
        });
      }
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

  /**
   * Merges fees + scholarships narrative from `feesMetaData` JSONB: inner `feesMetaData` and
   * `scholarshipsMetaData` segments; legacy `information`; root fallbacks. Appends prose from
   * **`CourseIntakeScholarships.scholarshipMetaData`** only (no synthetic lines from amount/name columns).
   */
  private metaInformationForFees(intake: UniCourseIntakes): MetaInformationItemDto[] {
    const root = intake.feesMetaData as Record<string, unknown> | undefined;
    let out: MetaInformationItemDto[] = [];

    if (root) {
      const innerFees = root.feesMetaData;
      const innerSch = root.scholarshipsMetaData;

      const feesParsed = this.tryParseMetaInformation(innerFees);
      const schParsed = this.tryParseMetaInformation(innerSch);

      const feesDesc = this.flattenMetaDescriptions(feesParsed);
      const rootNarrative = this.feesMetaRootNarrativeLines(root);
      const feesDescription =
        feesDesc.length > 0 ? feesDesc : rootNarrative;
      if (feesDescription.length > 0) {
        out.push({
          subtitle: 'feesMetaData',
          description: feesDescription,
        });
      }

      const schDesc = this.flattenMetaDescriptions(schParsed);
      if (schDesc.length > 0) {
        out.push({
          subtitle: 'ScholarshipsMetaData',
          description: schDesc,
        });
      }

      if (out.length === 0) {
        if (Array.isArray(root.information)) {
          out = root.information as MetaInformationItemDto[];
        } else {
          const rootParsed = this.tryParseMetaInformation(root);
          if (rootParsed.length > 0) {
            out = rootParsed;
          } else {
            out = this.metaInformationForFeesFromRootFallback(root);
          }
        }
      }
    }

    return this.ensureFeesMetaDataFromIntake(
      this.mergeRelationalScholarshipMeta(out, intake),
      intake,
    );
  }

  /**
   * Root **`feesMetaData`** keys outside nested narrative blobs — e.g. **`notes`**, **`tuitionYear`**.
   * Stops column-only tuition lines from masking DB copy when inner **`feesMetaData`** is absent.
   */
  private feesMetaRootNarrativeLines(root: Record<string, unknown>): string[] {
    const lines: string[] = [];
    const notes = root.notes;
    if (typeof notes === 'string' && notes.trim()) {
      lines.push(
        ...notes
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      );
    }
    const tuitionYear = root.tuitionYear;
    if (tuitionYear != null && tuitionYear !== '') {
      lines.push(`Tuition year: ${String(tuitionYear)}`);
    }
    return lines;
  }

  /**
   * When JSON narrative did not produce **`feesMetaData`** but **`UniCourseIntakes`** has tuition /
   * deposit / application (same resolution as **`courseDetails.feesAndScholarships.items`**), add or
   * fill **`subtitle: feesMetaData`** so **`meta`** lists fees alongside **`ScholarshipsMetaData`**.
   * Skipped when **`feesMetaData`** JSON already supplied any **`feesMetaData`** block (including root **`notes`**).
   */
  private ensureFeesMetaDataFromIntake(
    out: MetaInformationItemDto[],
    intake: UniCourseIntakes,
  ): MetaInformationItemDto[] {
    const idx = out.findIndex((i) => i.subtitle === 'feesMetaData');
    const existing = idx >= 0 ? (out[idx].description ?? []) : [];
    if (existing.length > 0) {
      return out;
    }

    const columnLines = this.linesFeesMetaFromIntakeColumns(intake);
    if (columnLines.length === 0) {
      return out;
    }

    const block: MetaInformationItemDto = {
      subtitle: 'feesMetaData',
      description: columnLines,
    };

    if (idx >= 0) {
      const next = [...out];
      next[idx] = block;
      return next;
    }

    return [block, ...out];
  }

  /** Tuition / deposit / application lines aligned with **`buildFeesAndScholarshipsSection`** items. */
  private linesFeesMetaFromIntakeColumns(intake: UniCourseIntakes): string[] {
    const feesJson = intake.feesMetaData as Record<string, unknown> | undefined;
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

    const amount = this.formatCurrencyAmount(rawAmount);
    const currency =
      (tuitionFromJson?.currency as string | undefined)?.trim() ??
      (intake.currency ?? '').trim() ??
      '';
    const freqLabel = (explicitFrequency ?? 'yearly').trim();

    const lines: string[] = [];
    const core = [amount, currency].filter(Boolean).join(' ');
    if (core) {
      lines.push(
        freqLabel ? `Tuition: ${core} (${freqLabel})` : `Tuition: ${core}`,
      );
    } else if (currency) {
      lines.push(`Currency: ${currency}`);
    }

    const dep = this.formatCurrencyAmount(intake.initialDeposit ?? undefined);
    if (dep != null && dep !== '') {
      lines.push(
        currency ?
          `Initial deposit: ${dep} ${currency}`
        : `Initial deposit: ${dep}`,
      );
    }

    const app = this.formatCurrencyAmount(intake.applicationFee ?? undefined);
    if (app != null && app !== '') {
      lines.push(
        currency ? `Application fee: ${app} ${currency}` : `Application fee: ${app}`,
      );
    }

    return lines;
  }

  /** Appends or creates **`ScholarshipsMetaData`** from parsed **`scholarshipMetaData`** JSONB on each row. */
  private mergeRelationalScholarshipMeta(
    out: MetaInformationItemDto[],
    intake: UniCourseIntakes,
  ): MetaInformationItemDto[] {
    const relLines = this.linesFromRelationalScholarships(intake);
    if (relLines.length === 0) {
      return out;
    }
    const idx = out.findIndex((i) => i.subtitle === 'ScholarshipsMetaData');
    if (idx >= 0) {
      const existing = out[idx].description ?? [];
      const next = [...out];
      next[idx] = {
        ...out[idx],
        description: [...existing, ...relLines],
      };
      return next;
    }
    return [
      ...out,
      {
        subtitle: 'ScholarshipsMetaData',
        description: relLines,
      },
    ];
  }

  /** Prose lines from **`scholarshipMetaData`** JSONB per active row only (relational columns are not turned into meta lines). */
  private linesFromRelationalScholarships(intake: UniCourseIntakes): string[] {
    const rows = (intake.CourseIntakeScholarship ?? []).filter((s) => s.isActive);
    const lines: string[] = [];
    for (const s of rows) {
      const fromMeta = this.tryParseMetaInformation(s.scholarshipMetaData);
      if (fromMeta.length === 0) {
        continue;
      }
      for (const item of fromMeta) {
        const desc = item.description ?? [];
        if (item.subtitle && desc.length > 0) {
          lines.push(...desc.map((d) => `${item.subtitle}: ${d}`));
        } else {
          lines.push(...desc);
        }
      }
    }
    return lines;
  }

  /** True when any active row has parseable **`scholarshipMetaData`** (drives fees **`hasInfo`** for meta). */
  private intakeHasRelationalScholarshipContent(intake: UniCourseIntakes): boolean {
    for (const s of intake.CourseIntakeScholarship ?? []) {
      if (!s.isActive) {
        continue;
      }
      if (this.tryParseMetaInformation(s.scholarshipMetaData).length > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * When nested `feesMetaData` / `scholarshipsMetaData` blobs are absent but the column still has
   * root `tuitionFees` and/or `scholarships` / `scholarshipsSummary` strings, expose them under the
   * same subtitles as the narrative JSON path so `meta` includes Fees & Scholarships.
   */
  private metaInformationForFeesFromRootFallback(
    root: Record<string, unknown>,
  ): MetaInformationItemDto[] {
    const out: MetaInformationItemDto[] = [];

    const tuitionLines = this.linesFromRootTuitionFees(root);
    if (tuitionLines.length > 0) {
      out.push({
        subtitle: 'feesMetaData',
        description: tuitionLines,
      });
    }

    const schRaw =
      (typeof root.scholarships === 'string' ? root.scholarships : '') ||
      (typeof root.scholarshipsSummary === 'string' ?
        root.scholarshipsSummary
      : '');
    const schTrim = schRaw.trim();
    if (schTrim) {
      out.push({
        subtitle: 'ScholarshipsMetaData',
        description: [schTrim],
      });
    }

    return out;
  }

  /** One line from root `tuitionFees` + optional root `frequency` (matches courseDetails fee copy). */
  private linesFromRootTuitionFees(root: Record<string, unknown>): string[] {
    const tf = root.tuitionFees;
    if (tf == null || typeof tf !== 'object' || Array.isArray(tf)) {
      return [];
    }
    const t = tf as Record<string, unknown>;
    const amount = t.amount != null && t.amount !== '' ? String(t.amount) : '';
    const currency = (t.currency as string | undefined)?.trim() ?? '';
    const freqTf = (t.frequency as string | undefined)?.trim() ?? '';
    const freqRoot =
      (typeof root.frequency === 'string' ? root.frequency.trim() : '') || '';
    const freq = freqTf || freqRoot;
    if (!amount && !currency && !freq) {
      return [];
    }
    const core = [amount, currency].filter(Boolean).join(' ');
    if (core && freq) {
      return [`Tuition: ${core} (${freq})`];
    }
    if (core) {
      return [`Tuition: ${core}`];
    }
    if (freq) {
      return [`Frequency: ${freq}`];
    }
    return [];
  }

  private flattenMetaDescriptions(items: MetaInformationItemDto[]): string[] {
    const lines: string[] = [];
    for (const item of items) {
      lines.push(...(item.description ?? []));
    }
    return lines;
  }

  /** Intake dates meta: same month-only list as `courseDetails.intakeDates.intakes`. */
  private metaInformationForIntakes(
    intake: UniCourseIntakes,
    section: ReturnType<CourseDetailsMapper['buildIntakeDatesSection']>,
  ): MetaInformationItemDto[] {
    const lines = section.intakes ?? [];
    if (lines.length > 0) {
      return [{ description: lines }];
    }
    return this.tryParseMetaInformation(intake.intakeMetaData);
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
      /** Single meta block: `{ "subtitle": "Scholarships", "description": ["…"] }` (no `information` wrapper). */
      if (
        Array.isArray(o.description) &&
        o.description.length > 0 &&
        o.description.every((x) => typeof x === 'string')
      ) {
        return [
          {
            subtitle: typeof o.subtitle === 'string' ? o.subtitle : undefined,
            description: o.description as string[],
          },
        ];
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

  /**
   * First `CourseIntakeScholarship` row with a usable `amount`. When multiple rows exist, only the first match is returned.
   */
  private mapRelationalScholarship(
    intake: UniCourseIntakes,
  ): ScholarshipDetailsDto | undefined {
    const rows = intake.CourseIntakeScholarship ?? [];
    const currency = intake.currency ?? null;
    for (const s of rows) {
      const scholarshipAmount = this.formatCurrencyAmount(s.amount ?? undefined);
      if (scholarshipAmount == null || scholarshipAmount === '') {
        continue;
      }
      const scholarshipName = (s.name ?? '').trim();
      const scholarshipType = (s.amountType ?? '').trim() || undefined;
      return {
        scholarshipName: scholarshipName || undefined,
        scholarshipAmount,
        currency: currency ?? undefined,
        scholarshipType,
      };
    }
    return undefined;
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

  /**
   * **`hasInfo`** when **`feesMetaData`** JSON is non-empty (**`isMetadataPresent`**) **or** any active
   * scholarship row has parseable **`scholarshipMetaData`** (relational name/amount columns do not set **`hasInfo`**).
   * Column-only tuition/deposit/application without JSON uses **`items`** with **`hasInfo` false** unless fees JSON exists.
   */
  private buildFeesAndScholarshipsSection(intake: UniCourseIntakes) {
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

    const hasInfo =
      this.isMetadataPresent(feesJson) ||
      this.intakeHasRelationalScholarshipContent(intake);

    const hasTuitionDetails = !!(
      tuitionFees.amount ||
      tuitionFees.currency ||
      explicitFrequency != null
    );

    const initialDeposit = this.formatCurrencyAmount(intake.initialDeposit ?? undefined);
    const applicationFee = this.formatCurrencyAmount(intake.applicationFee ?? undefined);
    const relationalScholarship = this.mapRelationalScholarship(intake);

    const hasColumnFeeDetails =
      hasTuitionDetails ||
      (initialDeposit != null && initialDeposit !== '') ||
      (applicationFee != null && applicationFee !== '') ||
      relationalScholarship != null;

    const shouldShowItems = hasInfo || hasColumnFeeDetails;

    const items: FeesAndScholarshipsItemsDto | undefined = shouldShowItems ?
        {
          tuitionFees: hasTuitionDetails ? tuitionFees : undefined,
          initialDeposit: initialDeposit ?? undefined,
          applicationFee: applicationFee ?? undefined,
          scholarships: relationalScholarship,
          scholarshipsSummary:
            hasInfo ? scholarshipsSummary ?? undefined : undefined,
        }
      : undefined;

    return {
      hasInfo,
      infoKey: 'feesAndScholarshipsMetaData' as const,
      items,
    };
  }

  /**
   * `intakes` lists **month names only**, unique and calendar-sorted:
   * - Every active intake row for the same `uniCourseId` contributes `intakeMonth`.
   * - Plus optional overrides from this row’s `intakeMetaData` (`months`, strings, prose).
   * `hasInfo` when there is at least one month to show or metadata implies the section.
   */
  private buildIntakeDatesSection(
    intake: UniCourseIntakes,
    allCourseIntakes: UniCourseIntakes[],
  ) {
    const intakes = this.intakeMonthsDisplayOnly(intake, allCourseIntakes);
    const hasInfo =
      intakes.length > 0 || this.isMetadataPresent(intake.intakeMetaData);
    return {
      hasInfo,
      infoKey: 'intakeDatesMetaData' as const,
      intakes: intakes.length > 0 ? intakes : undefined,
    };
  }

  /** Union: DB months for all course intakes + optional metadata on the viewed intake row. */
  private intakeMonthsDisplayOnly(
    intake: UniCourseIntakes,
    allCourseIntakes: UniCourseIntakes[],
  ): string[] {
    const combined: string[] = [];

    combined.push(...this.monthLabelsFromAllCourseIntakes(allCourseIntakes));

    const raw = intake.intakeMetaData;
    if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      if (
        Array.isArray(o.months) &&
        o.months.every((x) => typeof x === 'number')
      ) {
        const labels = (o.months as number[])
          .filter((m) => m >= 1 && m <= 12)
          .map((m) => MONTH_NAMES[m - 1]);
        combined.push(...labels);
      }
    }

    const fromStrings = this.linesFromIntakeMetaDataStrings(intake)
      .map((s) => this.toMonthOnlyLabel(s))
      .filter((s): s is string => s.length > 0);
    combined.push(...fromStrings);

    return this.uniqueSortedMonthLabels(combined);
  }

  private monthLabelsFromAllCourseIntakes(rows: UniCourseIntakes[]): string[] {
    const labels: string[] = [];
    for (const r of rows) {
      const lb = this.monthLabelFromEntityIntakeMonth(r.intakeMonth);
      if (lb) {
        labels.push(lb);
      }
    }
    return labels;
  }

  private linesFromIntakeMetaDataStrings(intake: UniCourseIntakes): string[] {
    const raw = intake.intakeMetaData;
    if (raw == null) {
      return [];
    }
    if (Array.isArray(raw) && raw.every((x) => typeof x === 'string')) {
      return raw as string[];
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      if (
        Array.isArray(o.intakes) &&
        o.intakes.every((x) => typeof x === 'string')
      ) {
        return o.intakes as string[];
      }
    }
    return this.flattenMetaDescriptions(this.tryParseMetaInformation(raw));
  }

  private monthLabelFromEntityIntakeMonth(month: number): string | null {
    if (month < 1 || month > 12) {
      return null;
    }
    return MONTH_NAMES[month - 1];
  }

  /** "April - 2026" → "April"; known month names canonicalized. */
  private toMonthOnlyLabel(s: string): string {
    const t = s.trim();
    const dashYear = /^([A-Za-z]+)\s*-\s*\d{4}$/.exec(t);
    if (dashYear) {
      return this.canonicalMonthName(dashYear[1]) ?? dashYear[1];
    }
    return this.canonicalMonthName(t) ?? t;
  }

  private canonicalMonthName(word: string): string | undefined {
    const idx = MONTH_NAMES.findIndex(
      (n) => n.toLowerCase() === word.trim().toLowerCase(),
    );
    return idx >= 0 ? MONTH_NAMES[idx] : undefined;
  }

  private uniqueSortedMonthLabels(labels: string[]): string[] {
    const order = new Map<string, number>(
      MONTH_NAMES.map((m, i) => [m, i]),
    );
    const unique = [...new Set(labels)];
    return unique.sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
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
