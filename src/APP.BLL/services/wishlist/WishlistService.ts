import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { AppDbContext } from '@infra/db/typeorm/AppDbContext';

import { AddWishlistDto } from '@shared/dtos/wishlists/AddWishlistDto';
import { WishlistListResponseDto } from '@shared/dtos/wishlists/WishlistListResponseDto';
import { WishlistActionResponseDto } from '@shared/dtos/wishlists/WishlistActionResponseDto';

@Injectable()
export class WishlistService {
  constructor(private readonly dbContext: AppDbContext) {}

  async addToWishlist(
    leadId: string,
    dto: AddWishlistDto,
  ): Promise<WishlistActionResponseDto> {
    const existing = await this.dbContext.leadFavouriteCourses.findOne({
      where: { leadId, courseIntakeId: dto.courseId },
    });

    if (existing) {
      throw new ConflictException('Course already exists in wishlist');
    }

    const wishlist = this.dbContext.leadFavouriteCourses.create({
      leadId,
      courseIntakeId: dto.courseId,
    });

    await this.dbContext.leadFavouriteCourses.save(wishlist);

    return {
      success: true,
      message: 'Course added to wishlist successfully',
    };
  }

  async removeFromWishlist(
    leadId: string,
    courseId: string,
  ): Promise<WishlistActionResponseDto> {
    const existing = await this.dbContext.leadFavouriteCourses.findOne({
      where: { leadId, courseIntakeId: courseId },
    });

    if (!existing) {
      throw new NotFoundException('Wishlist item not found');
    }

    await this.dbContext.leadFavouriteCourses.remove(existing);

    return {
      success: true,
      message: 'Course removed from wishlist successfully',
    };
  }

  async getWishlists(leadId: string): Promise<WishlistListResponseDto> {
    const wishlists = await this.dbContext.leadFavouriteCourses
      .createQueryBuilder('wishlist')
      .leftJoinAndSelect('wishlist.UniCourseIntake', 'intake')
      .leftJoinAndSelect('intake.UniCourse', 'course')
      .leftJoinAndSelect('course.SysUniversity', 'university')
      .leftJoinAndSelect('university.SysCountry', 'country')
      .leftJoinAndSelect('university.SysState', 'state')
      .leftJoinAndSelect('university.SysCity', 'city')
      .leftJoinAndSelect('course.CourseEngReq', 'engRequirements')
      .leftJoinAndSelect('engRequirements.SysEnglishTest', 'engTest')
      .leftJoinAndSelect('intake.CourseIntakeScholarship', 'scholarships')
      .where('wishlist.leadId = :leadId', { leadId })
      .orderBy('wishlist.createdAt', 'DESC')
      .getMany();

    return {
      wishlists: wishlists.map((item) => {
        const intake = item.UniCourseIntake;
        const course = intake?.UniCourse;
        const uni = course?.SysUniversity;

        return {
          courseId: item.courseIntakeId,
          courseName: course?.courseName ?? '',

          university: {
            id: uni?.id ?? '',
            name: uni?.uniName ?? '',
            country: uni?.SysCountry?.countryName ?? '',
            state: uni?.SysState?.stateName ?? '',
            city: uni?.SysCity?.cityName ?? '',
            logoUrl: uni?.logoUrl ?? '',
            imgUrl: uni?.coverImageUrl ?? '',
          },

          imgUrl: '',

          intake: {
            name: `${intake?.intakeMonth ?? ''}/${intake?.intakeYear ?? ''}`,
            year: intake?.intakeYear ?? 0,
          },

          tuitionFee: Number(intake?.tuitionFee ?? 0),
          currency: intake?.currency ?? '',
          durationMonths: intake?.courseDuration ?? 0,

          initialDeposit:
            intake?.initialDeposit != null ? Number(intake.initialDeposit) : null,
          applicationFee: Number(intake?.applicationFee ?? 0),

          isScholarshipAvailable:
            intake?.CourseIntakeScholarship?.some((s) => s.isActive) ?? false,

          engRequirements:
            course?.CourseEngReq?.map((req) => ({
              testName: req.SysEnglishTest?.testName ?? '',
              overall: Number(req.minOverallReq ?? 0),
              section: Number(req.minSectionReq ?? 0),
            })) ?? [],
        };
      }),
    };
  }
}
