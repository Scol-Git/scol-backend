import { Injectable } from '@nestjs/common';
import type { SysUniversities } from '@entity/entities/SysUniversities.entity';
import type {
  AboutUsDto,
  CampusLifeMediaDto,
  LocationDto,
  RankingDto,
} from '@shared/dtos/course-details/CourseDetailsDto';
import type {
  CommissionDto,
  CrmUniversityInfoDto,
} from '@shared/dtos/crm/universities/CrmUniversityDetailsResponseDto';
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

  private buildLocation(uni: SysUniversities): LocationDto {
    let link: string | null = null;
    if (uni.locationMapMetaData?.trim()) {
      try {
        link = new URL(uni.locationMapMetaData.trim()).href;
      } catch {
        link = null;
      }
    }

    return {
      city: uni.SysCity?.cityName ?? null,
      country: uni.SysCountry?.countryName ?? null,
      state: uni.SysState?.stateName ?? null,
      address: uni.address ?? null,
      coordinates: link ? { link } : null,
    };
  }
}
