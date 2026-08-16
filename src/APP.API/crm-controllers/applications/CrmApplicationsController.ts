import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import '../common/swagger/applications/swagger.doc';
import { CrmApplicationQueryService } from '@bll/crm-services/applications/CrmApplicationQueryService';
import { CrmApplicationDropdownDataResponseDto } from '@shared/dtos/crm/applications/CrmApplicationDropdownDataResponseDto';
import { CrmApplicationListRequestDto } from '@shared/dtos/crm/applications/CrmApplicationListRequestDto';
import { CrmApplicationListResponseDto } from '@shared/dtos/crm/applications/CrmApplicationListResponseDto';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';
import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

@ApiTags('CRM Application List')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  SuccessResponseDto,
  ErrorResponseDto,
  CrmApplicationListResponseDto,
  CrmApplicationDropdownDataResponseDto,
)
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN, Role.COUNSELLOR)
@Controller('crm/applications')
export class CrmApplicationsController {
  constructor(
    private readonly crmApplicationQuery: CrmApplicationQueryService,
  ) {}

  @Post('list')
  @AddSwaggerDoc('crmApplications', 'getApplicationList')
  async getApplicationList(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CrmApplicationListRequestDto,
  ): Promise<CrmApplicationListResponseDto> {
    return this.crmApplicationQuery.getApplicationList(user.userId, dto);
  }

  @Get('dropdown-data')
  @AddSwaggerDoc('crmApplications', 'getDropdownData')
  async getDropdownData(): Promise<CrmApplicationDropdownDataResponseDto> {
    return this.crmApplicationQuery.getDropdownData();
  }
}
