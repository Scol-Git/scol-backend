import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import '../common/swagger/search/swagger.doc';
import { CrmCourseSearchService } from '@bll/crm-services/search/CrmCourseSearchService';
import { CrmCourseSearchRequestDto } from '@shared/dtos/crm/search/CrmCourseSearchRequestDto';
import { CrmCourseSearchResponseDto } from '@shared/dtos/crm/search/CrmCourseSearchResponseDto';
import { AdvancedFiltersResponseDto } from '@shared/dtos/search/AdvancedFiltersResponseDto';
import { CourseResultDto } from '@shared/dtos/search/CourseResultDto';
import { CursorPaginationDto } from '@shared/dtos/search/CursorPaginationDto';
import { SearchFiltersDto } from '@shared/dtos/search/SearchFiltersDto';
import { SearchRangesDto } from '@shared/dtos/search/SearchRangesDto';
import { SearchFlagsDto } from '@shared/dtos/search/SearchFlagsDto';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';
import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

@ApiTags('CRM Course Search')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  SuccessResponseDto,
  ErrorResponseDto,
  CrmCourseSearchRequestDto,
  CrmCourseSearchResponseDto,
  AdvancedFiltersResponseDto,
  CourseResultDto,
  CursorPaginationDto,
  SearchFiltersDto,
  SearchRangesDto,
  SearchFlagsDto,
)
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN, Role.COUNSELLOR)
@Controller('crm/search')
export class CrmCourseSearchController {
  constructor(private readonly crmCourseSearchService: CrmCourseSearchService) {}

  /**
   * Combined CRM course search
   * POST /crm/search
   */
  @Post()
  @AddSwaggerDoc('crmSearch', 'search')
  async search(
    @CurrentUser() _user: ICurrentUser,
    @Body() request: CrmCourseSearchRequestDto,
  ): Promise<CrmCourseSearchResponseDto> {
    return this.crmCourseSearchService.search(request);
  }

  /**
   * Get available filter options for CRM course search
   * GET /crm/search/filters
   */
  @Get('filters')
  @AddSwaggerDoc('crmSearch', 'getFilters')
  async getFilters(): Promise<AdvancedFiltersResponseDto> {
    return this.crmCourseSearchService.getFilters();
  }
}
