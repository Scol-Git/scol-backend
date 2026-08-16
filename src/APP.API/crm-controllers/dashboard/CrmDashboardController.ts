import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { CrmDashboardQueryService } from '@bll/crm-services/dashboard/CrmDashboardQueryService';
import { CrmDashboardQueryDto } from '@shared/dtos/crm/dashboard/CrmDashboardQueryDto';
import {
  CrmDashboardApplicationIntakeStatisticsDto,
  CrmDashboardEnrollmentStatisticsDto,
  CrmDashboardLeadStatisticsDto,
  CrmDashboardLeadStatusDistributionDto,
  CrmDashboardQuickOverviewDto,
  CrmDashboardRecentLeadDto,
  CrmDashboardResponseDto,
} from '@shared/dtos/crm/dashboard/CrmDashboardResponseDto';
import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

@ApiTags('CRM Dashboard')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  CrmDashboardQueryDto,
  CrmDashboardResponseDto,
  CrmDashboardLeadStatisticsDto,
  CrmDashboardEnrollmentStatisticsDto,
  CrmDashboardApplicationIntakeStatisticsDto,
  CrmDashboardLeadStatusDistributionDto,
  CrmDashboardQuickOverviewDto,
  CrmDashboardRecentLeadDto,
)
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN, Role.COUNSELLOR)
@Controller('crm/dashboard')
export class CrmDashboardController {
  constructor(
    private readonly crmDashboardQueryService: CrmDashboardQueryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get CRM dashboard statistics' })
  async getDashboard(
    @CurrentUser() user: ICurrentUser,
    @Query() query: CrmDashboardQueryDto,
  ): Promise<CrmDashboardResponseDto> {
    return this.crmDashboardQueryService.getDashboard(user.userId, query);
  }
}
