import { Injectable } from '@nestjs/common';
import type { SysUniversities } from '@entity/entities/SysUniversities.entity';
import type {
  AboutUsDto,
  CampusLifeMediaDto,
  RankingDto,
} from '@shared/dtos/course-details/CourseDetailsDto';
import type {
  CommissionDto,
  CrmUniversityInfoDto,
  CrmUniversityLocationDto,
} from '@shared/dtos/crm/universities/CrmUniversityDetailsResponseDto';
import { extractLocationMapHref } from '@shared/utils/LocationMapMetaData';
import type { MetaItemDto } from '@shared/dtos/course-details/MetaItemDto';

@Injectable()
export class CrmUniversityDetailsMapper {
  toUniversityInfo(uni: SysUniversities): CrmUniversityInfoDto {
    return {
      uniId: uni.id,
      uniName: uni.uniName,
      uniLogoUrl: uni.logoUrl ?? null,
      uniCoverImageUrl: uni.coverImageUrl ?? null,
      website: uni.website ?? null,
      establishedYear: uni.establishedYear ?? null,
      universityType: uni.universityType ?? null,
      aboutUs: this.buildAboutUs(uni),
      campusLife: this.buildCampusLife(uni),
      location: this.buildLocation(uni),
      ranking: this.buildRanking(uni),
      isPublished: uni.isPublished,
      publishedAt: uni.publishedAt ? new Date(uni.publishedAt).toISOString() : null,
      importBatchId: uni.importBatchId ?? null,
    };
  }

  toCommission(uni: SysUniversities): CommissionDto {
    return {
      value: uni.commission ?? null,
      type: uni.commissionType ?? null,
    };
  }

  toMeta(uni: SysUniversities): MetaItemDto[] {
    if (!uni.rankingMetaData) return [];
    return [
      {
        infoKey: 'rankingMetaData',
        title: 'Ranking',
        information: uni.rankingMetaData,
      },
    ];
  }

  private buildRanking(uni: SysUniversities): RankingDto {
    return {
      position: uni.currRanking ?? null,
      hasInfo: uni.rankingMetaData != null,
      infoKey: 'rankingMetaData',
    };
  }

  private buildAboutUs(uni: SysUniversities): AboutUsDto | null {
    if (!uni.aboutUs) return null;
    return { description: uni.aboutUs.split(/\n\n+/).filter(Boolean) };
  }

  private buildCampusLife(uni: SysUniversities): CampusLifeMediaDto | null {
    if (!uni.campusLifeLinks?.length) return null;
    const videoUrl = uni.campusLifeLinks.flatMap((raw) =>
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
    return {
      media: { videoUrl: videoUrl.length > 0 ? videoUrl : null },
    };
  }

  private buildLocation(uni: SysUniversities): CrmUniversityLocationDto {
    const link = extractLocationMapHref(uni.locationMapMetaData);

    return {
      city: uni.SysCity?.cityName ?? null,
      cityId: uni.sysCityId ?? null,
      country: uni.SysCountry?.countryName ?? null,
      countryId: uni.sysCountryId ?? null,
      state: uni.SysState?.stateName ?? null,
      stateId: uni.sysStateId ?? null,
      address: uni.address ?? null,
      coordinates: link ? { link } : null,
    };
  }
}
