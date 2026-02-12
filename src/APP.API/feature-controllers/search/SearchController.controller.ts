import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiExtraModels,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';

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
import { AdvancedFiltersResponseDto } from '@shared/dtos/search/AdvancedFiltersResponseDto';
import { CourseResultDto } from '@shared/dtos/search/CourseResultDto';
import { CursorPaginationDto } from '@shared/dtos/search/CursorPaginationDto';
import { SearchFiltersDto } from '@shared/dtos/search/SearchFiltersDto';
import { SearchRangesDto } from '@shared/dtos/search/SearchRangesDto';
import { SearchFlagsDto } from '@shared/dtos/search/SearchFlagsDto';

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
   * Search courses with full filters, ranges, and flags.
   * Results are ranked by internal algorithm.
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

  /**
   * Get available filter options for advanced search
   * GET /search/advanced/filters
   *
   * Returns available countries and programmes for filtering.
   */
  @Get('advanced/filters')
  @ApiOperation({ summary: 'Get available filter options for advanced search' })
  async getAdvancedFilters(): Promise<AdvancedFiltersResponseDto> {
    return this.courseSearchService.getAdvancedFilters();
  }
}
