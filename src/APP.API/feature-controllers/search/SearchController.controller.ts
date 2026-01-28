import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiExtraModels, ApiBearerAuth } from '@nestjs/swagger';

// Guards
import { OptionalJwtAuthGuard } from '@api/common/guards/OptionalJwtAuthGuard.guard';

// Decorators
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';

// Types
import type { ICurrentUser } from '@shared/interfaces/domain';

// Services
import { CourseSearchService } from '@bll/services/search/CourseSearchService';

// DTOs
import { SearchRequestDto } from '@shared/dtos/search/SearchRequestDto';
import { AdvancedSearchRequestDto } from '@shared/dtos/search/AdvancedSearchRequestDto';
import { SearchResponseDto } from '@shared/dtos/search/SearchResponseDto';
import { CourseResultDto } from '@shared/dtos/search/CourseResultDto';
import { CursorPaginationDto } from '@shared/dtos/search/CursorPaginationDto';
import { SearchFiltersDto } from '@shared/dtos/search/SearchFiltersDto';
import { SearchRangesDto } from '@shared/dtos/search/SearchRangesDto';
import { SearchFlagsDto } from '@shared/dtos/search/SearchFlagsDto';
import { SortDto } from '@shared/dtos/search/SortDto';

/**
 * Search Controller
 *
 * Handles search endpoints:
 * - POST /search - Normal search with text
 * - POST /search/advanced - Advanced search with full filters
 *
 * Works for both:
 * - Anonymous users (business-only ranking)
 * - Authenticated users (eligibility + business ranking)
 */
@ApiTags('search')
@ApiExtraModels(
  SearchRequestDto,
  AdvancedSearchRequestDto,
  SearchResponseDto,
  CourseResultDto,
  CursorPaginationDto,
  SearchFiltersDto,
  SearchRangesDto,
  SearchFlagsDto,
  SortDto,
)
@Controller('search')
export class SearchController {
  constructor(private readonly courseSearchService: CourseSearchService) {}

  /**
   * Normal search
   * POST /search
   *
   * Search courses with text query.
   * Strict matching - no results if no match.
   */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async search(
    @Body() request: SearchRequestDto,
    @CurrentUser() user?: ICurrentUser,
  ): Promise<SearchResponseDto> {
    return this.courseSearchService.search(request, user);
  }

  /**
   * Advanced search
   * POST /search/advanced
   *
   * Search courses with full filters, ranges, flags, and sorting.
   * Strict matching - no results if no match.
   */
  @Post('advanced')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async advancedSearch(
    @Body() request: AdvancedSearchRequestDto,
    @CurrentUser() user?: ICurrentUser,
  ): Promise<SearchResponseDto> {
    return this.courseSearchService.advancedSearch(request, user);
  }
}
