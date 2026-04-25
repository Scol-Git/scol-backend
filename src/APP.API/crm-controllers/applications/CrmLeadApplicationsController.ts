import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { CrmApplicationCreationService } from '@bll/crm-services/applications/CrmApplicationCreationService';
import { CrmApplicationQueryService } from '@bll/crm-services/applications/CrmApplicationQueryService';
import { CreateApplicationRequestDto } from '@shared/dtos/applications/CreateApplicationRequestDto';
import { CreateApplicationResponseDto } from '@shared/dtos/applications/CreateApplicationResponseDto';
import { GetApplicationsResponseDto } from '@shared/dtos/applications/GetApplicationsResponseDto';
import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

@ApiTags('CRM Applications')
@Controller('crm/leads/:leadId/applications')
export class CrmLeadApplicationsController {
  constructor(
    private readonly crmApplicationCreation: CrmApplicationCreationService,
    private readonly crmApplicationQuery: CrmApplicationQueryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @RequireRole(Role.ADMIN, Role.COUNSELLOR)
  @ApiBearerAuth('JWT-auth')
  async createApplicationForLead(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: CreateApplicationRequestDto,
  ): Promise<CreateApplicationResponseDto> {
    return this.crmApplicationCreation.createApplicationForLead(
      user.userId,
      leadId,
      dto,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @RequireRole(Role.ADMIN, Role.COUNSELLOR)
  @ApiBearerAuth('JWT-auth')
  async getApplicationsForLead(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
  ): Promise<GetApplicationsResponseDto> {
    return this.crmApplicationQuery.getApplicationsForLead(user.userId, leadId);
  }
}
