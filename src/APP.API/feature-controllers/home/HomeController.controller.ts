import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiExtraModels, ApiBearerAuth } from '@nestjs/swagger';

// Guards
import { OptionalJwtAuthGuard } from '@api/common/guards/OptionalJwtAuthGuard.guard';

// Decorators
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';

// Types
import type { ICurrentUser } from '@shared/interfaces/domain';

// Services
import { HomeSearchService } from '@bll/services/search/HomeSearchService';

// DTOs
import { HomeRequestDto } from '@shared/dtos/search/HomeRequestDto';
import { SearchResponseDto } from '@shared/dtos/search/SearchResponseDto';
import { CourseResultDto } from '@shared/dtos/search/CourseResultDto';
import { CursorPaginationDto } from '@shared/dtos/search/CursorPaginationDto';

/**
 * Home Controller
 *
 * Handles home page endpoint:
 * - POST /home - Get courses for home page (infinite scroll)
 *
 * Works for both:
 * - Anonymous users (business-only ranking)
 * - Authenticated users (eligibility + business ranking)
 */
@ApiTags('home')
@ApiExtraModels(
  HomeRequestDto,
  SearchResponseDto,
  CourseResultDto,
  CursorPaginationDto,
)
@Controller('home')
export class HomeController {
  constructor(private readonly homeSearchService: HomeSearchService) {}

  /**
   * Get home page courses
   * POST /home
   *
   * Returns courses with:
   * - Weight-based ranking (commission, academic match, preferences)
   * - Cursor-based pagination for infinite scroll
   * - Eligibility classification (ELIGIBLE_ONLY or INELIGIBLE_ONLY)
   */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getHomeCourses(
    @Body() request: HomeRequestDto,
    @CurrentUser() user?: ICurrentUser,
  ): Promise<SearchResponseDto> {
    return this.homeSearchService.getHomeCourses(request, user);
  }
}
